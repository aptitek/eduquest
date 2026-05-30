import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Handshake, Search, Users } from 'lucide-react';
import { GameHeader } from '../components/organisms/GameHeader';
import { GameLayout } from '../components/templates/GameLayout';
import { CompoundBadge } from '../components/atoms/CompoundBadge';
import { HoldToConfirmButton } from '../components/atoms/HoldToConfirmButton';
import {
  PlayingHandPanel,
  type PlayingCardFace,
  type PlayingCardProps,
  type PlayingHandData,
} from '../components/molecules/PlayingCard';
import { fetchClassRoster, joinGuild, updateGuild, type ClassRosterGuild, type GuildFieldsPayload } from '../features/game/api';
import { useGameStore } from '../features/game/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../utils/cn';
import {
  buildClassGuildHand,
  buildGuildCardHands,
  getLatestCohortMembership,
} from '../components/organisms/DashboardDock/dashboardDockData';
import { useErrorReporter } from '../features/errors/notifications';
import { buildCharacterPlayingCardData } from '../features/game/cards/characterCardAdapter';
import { formatUserDisplayName } from '../utils/displayName';
import mascotUrl from '../assets/mascot.svg';

const DEFAULT_GUILD_MAX_MEMBERS = 3;
type EditableGuildField = 'title' | 'description' | 'art' | 'typeIcon';
type EditableGuildCardOverride = Partial<Record<EditableGuildField, string>> & {
  color?: string;
};

export function AnnuairePage() {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const { user, student, character, selectedGameId, setStudentGuild } = useGameStore();
  const [guilds, setGuilds] = useState<ClassRosterGuild[]>([]);
  const [currentGuildId, setCurrentGuildId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedJoinGuildId, setRevealedJoinGuildId] = useState<string | null>(null);
  const [completedJoinGuildRevealId, setCompletedJoinGuildRevealId] = useState<string | null>(null);
  const [joiningGuildId, setJoiningGuildId] = useState<string | null>(null);
  const [editableGuildCards, setEditableGuildCards] = useState<Record<string, EditableGuildCardOverride>>({});
  const [loading, setLoading] = useState(true);
  const currentGuildSectionRef = useRef<HTMLElement | null>(null);
  const latestMembership =
    (selectedGameId &&
      student?.cohortMemberships?.find((membership) => membership.cohortId === selectedGameId)) ||
    getLatestCohortMembership(student?.cohortMemberships);
  const membershipGuild = latestMembership?.guild;
  const currentGuild =
    guilds.find((guild) => guild.id === currentGuildId || guild.id === membershipGuild?.id) || membershipGuild;
  const currentGuildKey = getGuildIdentityKey(currentGuild);

  useEffect(() => {
    let isMounted = true;

    const loadGuilds = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('eduquest_token');
        if (!token) throw new Error('Missing session token.');
        const roster = await fetchClassRoster(token, selectedGameId);
        if (isMounted) {
          setGuilds(roster.guilds);
          setCurrentGuildId(roster.currentGuildId);
        }
      } catch (error) {
        reportError(error, {
          messageKey: 'directory.errors.loadGuilds',
          id: 'directory.errors.loadGuilds',
          logMessage: 'Could not load directory guilds.',
        });
        if (isMounted) {
          setGuilds([]);
          setCurrentGuildId(undefined);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadGuilds();

    return () => {
      isMounted = false;
    };
  }, [selectedGameId, reportError]);

  const currentGuildHand = useMemo(() => {
    if (!currentGuild || !student || !user || !character) return undefined;

    return buildGuildCardHands(t, {
      guild: currentGuild,
      guildName: currentGuild.name || t('dashboard.dock.playerGuild'),
      playerStudentId: student.id,
      playerName: formatUserDisplayName(user),
      playerAvatar: character.illustrationUrl || user.avatarUrl || user.githubAvatarUrl || mascotUrl,
      characterClass: character.characterClass,
      characterClassLabel: t(`game.classes.${character.characterClass}`),
      characterStats: character.stats,
      activeCardIndex: 0,
    })[0];
  }, [character, currentGuild, student, t, user]);

  const additionalGuilds = useMemo(() => {
    const normalizedQuery = normalizeSearch(searchQuery);
    return mergeGuilds(currentGuild ? [currentGuild] : [], guilds)
      .filter((guild) => getGuildIdentityKey(guild) !== currentGuildKey)
      .filter((guild) => !normalizedQuery || doesGuildMatchSearch(guild, normalizedQuery))
      .sort(sortByName);
  }, [currentGuild, currentGuildKey, guilds, searchQuery]);
  const groupedGuilds = useMemo(() => groupGuildsByInitial(additionalGuilds), [additionalGuilds]);

  const applyUpdatedGuild = useCallback((updatedGuild: ClassRosterGuild) => {
    setGuilds((current) => upsertGuild(current, updatedGuild));
    setCurrentGuildId((current) => current === updatedGuild.id ? updatedGuild.id : current);
  }, []);

  const updateEditableGuildField = useCallback(
    (guildId: string, field: EditableGuildField, value: string) => {
      setEditableGuildCards((current) => ({
        ...current,
        [guildId]: {
          ...current[guildId],
          [field]: value,
        },
      }));

      const payload = getGuildFieldPayload(field, value);
      if (!payload) return;

      const token = localStorage.getItem('eduquest_token');
      if (!token) return;

      updateGuild(token, guildId, payload)
        .then((updatedGuild) => applyUpdatedGuild(updatedGuild as ClassRosterGuild))
        .catch((error) => {
          reportError(error, {
            messageKey: 'guild.errors.create',
            id: `directory.errors.updateGuild.${guildId}`,
            logMessage: 'Could not update guild from directory.',
          });
        });
    },
    [applyUpdatedGuild, reportError]
  );

  const updateEditableGuildColor = useCallback(
    (guildId: string, color: string) => {
      setEditableGuildCards((current) => ({
        ...current,
        [guildId]: {
          ...current[guildId],
          color,
        },
      }));

      const token = localStorage.getItem('eduquest_token');
      if (!token) return;

      updateGuild(token, guildId, { color })
        .then((updatedGuild) => applyUpdatedGuild(updatedGuild as ClassRosterGuild))
        .catch((error) => {
          reportError(error, {
            messageKey: 'guild.errors.create',
            id: `directory.errors.updateGuildColor.${guildId}`,
            logMessage: 'Could not update guild color from directory.',
          });
        });
    },
    [applyUpdatedGuild, reportError]
  );
  const openCharacterPageForStudent = useCallback((studentId: string | undefined) => {
    if (!studentId) return;
    window.location.hash = `character?studentId=${encodeURIComponent(studentId)}`;
  }, []);

  const handleJoinGuild = async (guild: ClassRosterGuild) => {
    if (joiningGuildId) return;
    if (isGuildFull(guild)) return;
    setJoiningGuildId(guild.id);
    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedGuild = await joinGuild(token, guild.id);
      const nextGuild = { ...guild, ...updatedGuild } as ClassRosterGuild;
      if (nextGuild.cohortId) setStudentGuild(nextGuild.cohortId, nextGuild);
      setCurrentGuildId(nextGuild.id);
      setGuilds((current) => upsertGuild(current, nextGuild));
      setRevealedJoinGuildId(null);
      setCompletedJoinGuildRevealId(null);
      window.requestAnimationFrame(() => {
        currentGuildSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      const roster = await fetchClassRoster(token, selectedGameId);
      setGuilds(roster.guilds);
      setCurrentGuildId(roster.currentGuildId || nextGuild.id);
    } catch (error) {
      reportError(error, {
        messageKey: 'directory.errors.joinGuild',
        id: 'directory.errors.joinGuild',
        logMessage: 'Could not join guild from directory.',
      });
    } finally {
      setJoiningGuildId(null);
    }
  };

  useEffect(() => {
    if (loading) return;

    const rawTarget = sessionStorage.getItem('eduquest_directory_scroll_target');
    if (!rawTarget) return;

    sessionStorage.removeItem('eduquest_directory_scroll_target');

    let target: { guildName?: string; memberId?: string } = {};
    try {
      target = JSON.parse(rawTarget) as typeof target;
    } catch {
      target = {};
    }

    scrollToClassTarget(target);
  }, [loading, groupedGuilds]);

  return (
    <GameLayout>
      <GameHeader currentView="annuaire" />

      <div className="space-y-8">
        <h2 className="sr-only">{t('directory.title')}</h2>

        {currentGuildHand ? (
          <motion.section
            layout
            ref={currentGuildSectionRef}
            aria-labelledby="directory-current-guild-title"
            className="scroll-mt-24 space-y-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Users className="text-status-quest" size={22} aria-hidden />
              <h3 id="directory-current-guild-title" className="text-xl font-bold">
                {t('directory.currentGuild')}
              </h3>
              <CompoundBadge
                parts={[
                  `${currentGuildHand.cards.length} ${t(
                    currentGuildHand.cards.length > 1 ? 'directory.cards' : 'directory.card'
                  )}`,
                ]}
              />
            </div>
            <p className="max-w-3xl text-sm text-text-secondary">
              {t('directory.currentGuildHelp')}
            </p>
            <PlayingHandPanel
              hand={currentGuildHand}
              className="border-status-quest/60 bg-gaming-card/70 shadow-glow-primary"
              handClassName="h-[30rem] md:h-[32rem]"
            />
          </motion.section>
        ) : null}

        <motion.section
          layoutId="directory-guilds-list"
          transition={{ layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } }}
          aria-labelledby="directory-guilds-title"
          className="relative rounded-3xl border border-gaming-border bg-gaming-card/40 p-4 shadow-lg"
        >
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Users className="text-status-quest" size={22} aria-hidden />
              <h3 id="directory-guilds-title" className="text-xl font-bold">
                {t('directory.otherGuilds')}
              </h3>
              <CompoundBadge
                parts={[loading ? t('common.loading') : `${additionalGuilds.length} ${t('class.guildCount')}`]}
              />
            </div>

            <label className="relative block w-full max-w-md">
              <span className="sr-only">{t('directory.searchLabel')}</span>
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('directory.searchPlaceholder')}
                className="w-full rounded-2xl border border-gaming-border bg-gaming-base/80 py-2 pl-10 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
              />
            </label>
          </div>

          {additionalGuilds.length > 0 ? (
            <div className="space-y-6">
              {groupedGuilds.map((group) => (
                <div key={group.letter} id={`guild-letter-${group.letter}`} className="scroll-mt-24 space-y-3">
                  <h4 className="font-display text-sm font-bold uppercase tracking-[0.24em] text-status-campfire">
                    {group.letter}
                  </h4>
                  <div className="space-y-5">
                    {group.guilds.map((guild) => {
                      const hand = buildJoinableGuildHand({
                        t,
                        guild,
                        currentGuild,
                        user,
                        character,
                        canEditGuild: Boolean(user?.isAdmin),
                        guildOverride: editableGuildCards[guild.id],
                        onGuildFieldChange: (field, value) => updateEditableGuildField(guild.id, field, value),
                        onGuildColorChange: (color) => updateEditableGuildColor(guild.id, color),
                        onMemberSelect: user?.isAdmin ? openCharacterPageForStudent : undefined,
                        isRevealed: revealedJoinGuildId === guild.id,
                        isRevealComplete: completedJoinGuildRevealId === guild.id,
                        isJoining: joiningGuildId === guild.id,
                        onReveal: () => {
                          setRevealedJoinGuildId(guild.id);
                          setCompletedJoinGuildRevealId(null);
                        },
                        onRevealComplete: () => setCompletedJoinGuildRevealId(guild.id),
                        onJoin: () => void handleJoinGuild(guild),
                      });

                      return <ClassHandSection key={hand.id} hand={hand} />;
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-gaming-border p-6 text-center text-sm text-text-muted">
              {searchQuery.trim() ? t('directory.noSearchResults') : t('directory.noOtherGuilds')}
            </p>
          )}
        </motion.section>
      </div>
    </GameLayout>
  );
}

function buildJoinableGuildHand({
  t,
  guild,
  currentGuild,
  user,
  character,
  canEditGuild,
  guildOverride,
  onGuildFieldChange,
  onGuildColorChange,
  onMemberSelect,
  isRevealed,
  isRevealComplete,
  isJoining,
  onReveal,
  onRevealComplete,
  onJoin,
}: {
  t: (path: string) => string;
  guild: ClassRosterGuild;
  currentGuild?: Partial<ClassRosterGuild>;
  user: ReturnType<typeof useGameStore.getState>['user'];
  character: ReturnType<typeof useGameStore.getState>['character'];
  canEditGuild: boolean;
  guildOverride?: EditableGuildCardOverride;
  onGuildFieldChange: (field: EditableGuildField, value: string) => void;
  onGuildColorChange: (color: string) => void;
  onMemberSelect?: (studentId: string | undefined) => void;
  isRevealed: boolean;
  isRevealComplete: boolean;
  isJoining: boolean;
  onReveal: () => void;
  onRevealComplete: () => void;
  onJoin: () => void;
}): PlayingHandData {
  const baseHand = buildClassGuildHand(t, { guild });
  const hand = canEditGuild
    ? {
        ...baseHand,
        cards: baseHand.cards.map((card) => {
          if (card.kind === 'guild') {
            return makeEditableGuildCard({
              card,
              override: guildOverride,
              onFieldChange: onGuildFieldChange,
              onColorChange: onGuildColorChange,
            });
          }

          if (card.kind === 'character') {
            return {
              ...card,
              interactive: true,
              onClick: () => onMemberSelect?.(getStudentIdFromMemberCard(card)),
            };
          }

          return card;
        }) as [PlayingCardProps, ...PlayingCardProps[]],
      }
    : baseHand;

  if (user?.isAdmin || isGuildFull(guild)) return hand;

  return {
    ...hand,
    cards: [...hand.cards, buildJoinGuildCard({
      t,
      guild,
      currentGuild,
      user,
      character,
      isRevealed,
      isRevealComplete,
      isJoining,
      onReveal,
      onRevealComplete,
      onJoin,
    })] as [PlayingCardProps, ...PlayingCardProps[]],
  };
}

function makeEditableGuildCard({
  card,
  override,
  onFieldChange,
  onColorChange,
}: {
  card: PlayingCardProps;
  override?: EditableGuildCardOverride;
  onFieldChange: (field: EditableGuildField, value: string) => void;
  onColorChange: (color: string) => void;
}): PlayingCardProps {
  const editableBack = card.model.back
    ? applyEditableGuildFace({
        face: card.model.back,
        override,
        onFieldChange,
        onColorChange,
      })
    : undefined;

  return {
    ...card,
    model: {
      ...card.model,
      front: applyEditableGuildFace({
        face: card.model.front,
        override,
        onFieldChange,
        onColorChange,
      }) || card.model.front,
      ...(editableBack !== undefined ? { back: editableBack } : {}),
    },
  };
}

function applyEditableGuildFace({
  face,
  override,
  onFieldChange,
  onColorChange,
}: {
  face: PlayingCardFace | undefined;
  override?: EditableGuildCardOverride;
  onFieldChange: (field: EditableGuildField, value: string) => void;
  onColorChange: (color: string) => void;
}): PlayingCardFace | undefined {
  if (!face || face === 'none') return face;
  const descriptionSection = face.info?.sections?.find((section) => section.id === 'description');
  const iconValue = override?.typeIcon ?? face.icon?.value;

  return {
    ...face,
    title: {
      ...face.title,
      value: override?.title ?? face.title?.value,
      editable: true,
      onChange: (value) => onFieldChange('title', value),
    },
    art: {
      ...face.art,
      value: override?.art ?? face.art?.value,
      editable: true,
      onChange: (value) => onFieldChange('art', value),
    },
    color: {
      ...face.color,
      value: override?.color ?? face.color?.value,
      editable: true,
      onChange: onColorChange,
    },
    icon: face.icon
      ? {
          ...face.icon,
          value: iconValue,
          editable: true,
          onChange: (value) => onFieldChange('typeIcon', value),
        }
      : face.icon,
    type: face.icon
      ? {
          ...(face.type || { variant: 'custom' as const }),
          icon: {
            ...face.type?.icon,
            value: iconValue,
            editable: true,
            onChange: (value: string) => onFieldChange('typeIcon', value),
          },
        }
      : face.type,
    info: {
      ...face.info,
      sections: [
        ...(descriptionSection
          ? [
              {
                ...descriptionSection,
                description: {
                  ...descriptionSection.description,
                  value: override?.description ?? descriptionSection.description?.value,
                  editable: true,
                  onChange: (value: string) => onFieldChange('description', value),
                },
              },
            ]
          : []),
        ...(face.info?.sections || []).filter((section) => section.id !== 'description'),
      ],
    },
  };
}

function buildJoinGuildCard({
  t,
  guild,
  currentGuild,
  user,
  character,
  isRevealed,
  isRevealComplete,
  isJoining,
  onReveal,
  onRevealComplete,
  onJoin,
}: {
  t: (path: string) => string;
  guild: ClassRosterGuild;
  currentGuild?: Partial<ClassRosterGuild>;
  user: ReturnType<typeof useGameStore.getState>['user'];
  character: ReturnType<typeof useGameStore.getState>['character'];
  isRevealed: boolean;
  isRevealComplete: boolean;
  isJoining: boolean;
  onReveal: () => void;
  onRevealComplete: () => void;
  onJoin: () => void;
}): PlayingCardProps {
  const guildName = guild.name || t('dashboard.dock.playerGuild');

  if (!isRevealed || !user || !character) {
    return {
      id: `join-${guild.id}`,
      layoutId: `join-${guild.id}`,
      kind: 'student',
      accentToken: 'neutral',
      model: { front: 'none' },
      interactive: Boolean(user && character),
      onClick: user && character ? onReveal : undefined,
    };
  }

  const classLabel = t(`game.classes.${character.characterClass}`);
  const playerName = formatUserDisplayName(user);
  const currentGuildName = currentGuild?.name || t('directory.currentGuildFallback');
  const description = currentGuild?.id
    ? t('directory.joinGuildWarning')
        .replace('{currentGuild}', currentGuildName)
        .replace('{targetGuild}', guildName)
    : t('directory.joinGuildNoCurrentWarning').replace('{targetGuild}', guildName);

  const card = buildCharacterPlayingCardData({
    id: `join-${guild.id}`,
    layoutId: `join-${guild.id}`,
    displayName: playerName,
    subtitle: classLabel,
    description,
    characterClass: character.characterClass,
    classLabel,
    illustrationUrl: character.illustrationUrl || user.avatarUrl || user.githubAvatarUrl || mascotUrl,
    typeText: classLabel,
  });
  const joinButton = (
    <div className="flex w-full items-center justify-center">
      <HoldToConfirmButton
        onConfirm={onJoin}
        holdDuration={1200}
        disabled={isJoining}
        variant="btn-primary"
        className="min-h-24 w-full flex-col border-primary/40 bg-primary px-3 text-center text-primary-content"
      >
        <Handshake size={28} aria-hidden />
        <span className="font-display text-sm font-black uppercase tracking-[0.12em]">
          {isJoining ? t('directory.joiningGuild') : t('directory.joinGuild')}
        </span>
      </HoldToConfirmButton>
    </div>
  );

  const front =
    card.model.front && card.model.front !== 'none'
      ? {
          ...card.model.front,
          title: card.model.front.title || { value: playerName, variant: 'title' },
          info: { ...card.model.front.info, stats: undefined },
          actions: joinButton,
        }
      : card.model.front;

  return {
    ...card,
    model: isRevealComplete
      ? {
          ...card.model,
          front,
        }
      : {
          front: 'none',
          back: front,
        },
    autoFlipToBack: !isRevealComplete,
    onAutoFlipComplete: onRevealComplete,
  };
}

function ClassHandSection({ hand }: { hand: PlayingHandData }) {
  return (
    <PlayingHandPanel
      hand={hand}
      id={`class-guild-${slugify(hand.title || 'guild')}`}
      className={cn('bg-gaming-base/40')}
      onCardSelect={(card) => card.onClick?.()}
    />
  );
}

function groupGuildsByInitial(guilds: ClassRosterGuild[]) {
  const groups = guilds.reduce<Record<string, ClassRosterGuild[]>>((accumulator, guild) => {
    const letter = getGuildInitial(guild);
    accumulator[letter] = accumulator[letter] || [];
    accumulator[letter].push(guild);
    return accumulator;
  }, {});

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, groupGuilds]) => ({ letter, guilds: groupGuilds }));
}

function mergeGuilds(
  primaryGuilds: readonly Partial<ClassRosterGuild>[],
  secondaryGuilds: readonly ClassRosterGuild[]
) {
  const guildMap = new Map<string, ClassRosterGuild>();

  [...primaryGuilds, ...secondaryGuilds].forEach((guild) => {
    if (!guild.name) return;
    guildMap.set(getGuildIdentityKey(guild), {
      id: getGuildStableId(guild),
      name: guild.name,
      cohortId: guild.cohortId || '',
      description: guild.description,
      iconUrl: guild.iconUrl,
      iconKey: guild.iconKey,
      color: guild.color,
      gold: guild.gold || 0,
      boostPointsSpent: guild.boostPointsSpent || 0,
      members: guild.members,
      createdAt: guild.createdAt || new Date().toISOString(),
      updatedAt: guild.updatedAt || new Date().toISOString(),
    } as ClassRosterGuild);
  });

  return Array.from(guildMap.values());
}

function upsertGuild(guilds: ClassRosterGuild[], guild: ClassRosterGuild) {
  const previousGuild = guilds.find((candidate) => candidate.id === guild.id);
  const nextGuild = previousGuild
    ? {
        ...previousGuild,
        ...guild,
        members: guild.members ?? previousGuild.members,
      }
    : guild;

  return [nextGuild, ...guilds.filter((candidate) => candidate.id !== guild.id)];
}

function getGuildFieldPayload(field: EditableGuildField, value: string): GuildFieldsPayload | null {
  if (field === 'title') return { name: value };
  if (field === 'description') return { description: value };
  if (field === 'art') return { iconUrl: value };
  if (field === 'typeIcon') return { iconKey: value };
  return null;
}

function getStudentIdFromMemberCard(card: PlayingCardProps) {
  const id = card.id || '';
  const marker = '-member-';
  const markerIndex = id.indexOf(marker);
  return markerIndex >= 0 ? id.slice(markerIndex + marker.length) : undefined;
}

function doesGuildMatchSearch(guild: ClassRosterGuild, normalizedQuery: string) {
  const values = [
    guild.name,
    guild.description,
    ...(guild.members || []).flatMap((member) => [
      member.displayName,
      member.email,
      member.institutionalEmail,
      member.characterClass,
    ]),
  ];

  return values.some((value) => normalizeSearch(value).includes(normalizedQuery));
}

function sortByName(a: ClassRosterGuild, b: ClassRosterGuild) {
  return a.name.localeCompare(b.name);
}

function getGuildInitial(guild: ClassRosterGuild) {
  return guild.name.trim().charAt(0).toLocaleUpperCase() || '#';
}

function getGuildStableId(guild: Partial<ClassRosterGuild>) {
  return guild.id || slugify(guild.name || 'guild');
}

function getGuildIdentityKey(guild?: Partial<ClassRosterGuild>) {
  if (!guild) return '';
  return slugify(guild.name || getGuildStableId(guild));
}

function getGuildMaxMembers(guild: ClassRosterGuild) {
  return Number.isFinite(guild.maxMembers) && guild.maxMembers && guild.maxMembers > 0
    ? guild.maxMembers
    : DEFAULT_GUILD_MAX_MEMBERS;
}

function isGuildFull(guild: ClassRosterGuild) {
  return (guild.members?.length || 0) >= getGuildMaxMembers(guild);
}

function normalizeSearch(value: string | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function slugify(value: string) {
  return normalizeSearch(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function scrollToClassTarget(target: { guildName?: string; memberId?: string }, attempts = 8) {
  const element = target.guildName
    ? document.getElementById(`class-guild-${slugify(target.guildName)}`)
    : document.getElementById('directory-guilds-title');

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (attempts <= 0) return;
  window.setTimeout(() => scrollToClassTarget(target, attempts - 1), 80);
}

export default AnnuairePage;

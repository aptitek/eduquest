import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Trophy, UserRound, Users } from 'lucide-react';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { CompoundBadge } from '../../components/atoms/CompoundBadge';
import { PlayingCard, PlayingHandPanel, type PlayingCardData } from '../../components/molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../components/molecules/ResponsiveCardGrid/ResponsiveCardGrid';
import { fetchClassRoster, type ClassRosterGuild, type ClassRosterStudent } from '../../features/game/api';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import {
  buildClassGuildHand,
  getLatestCohortMembership,
} from '../../components/organisms/DashboardDock/dashboardDockData';

const ALPHABET_SCROLL_MIN_GUILDS = 12;
const ALPHABET_SCROLL_MIN_LETTERS = 5;

export function ClassPage() {
  const { t } = useTranslation();
  const { student, selectedGameId } = useGameStore();
  const [guilds, setGuilds] = useState<ClassRosterGuild[]>([]);
  const [unguildedStudents, setUnguildedStudents] = useState<ClassRosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const latestMembership =
    (selectedGameId &&
      student?.cohortMemberships?.find((membership) => membership.cohortId === selectedGameId)) ||
    getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild;

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
          setUnguildedStudents(roster.unguildedStudents);
        }
      } catch (error) {
        console.warn('Could not load class guilds.', error);
        toast.error(
          t('class.errors.loadGuilds').replace('{detail}', getErrorMessage(error)),
          { id: 'class.errors.loadGuilds' }
        );
        if (isMounted) {
          setGuilds([]);
          setUnguildedStudents([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadGuilds();

    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  const classGuilds = useMemo(() => {
    return mergeGuilds(playerGuild ? [playerGuild] : [], guilds);
  }, [guilds, playerGuild]);
  const podiumGuilds = useMemo(
    () => [...classGuilds].sort(sortByPointsThenName).slice(0, 3),
    [classGuilds]
  );
  const podiumKeys = new Set(podiumGuilds.map(getGuildIdentityKey));
  const remainingGuilds = useMemo(
    () => classGuilds.filter((guild) => !podiumKeys.has(getGuildIdentityKey(guild))).sort(sortByName),
    [classGuilds, podiumKeys]
  );
  const groupedGuilds = useMemo(() => groupGuildsByInitial(remainingGuilds), [remainingGuilds]);
  const groupedHands = useMemo(
    () =>
      groupedGuilds.map((group) => ({
        letter: group.letter,
        hands: group.guilds.map((guild) => buildClassGuildHand(t, { guild })),
      })),
    [groupedGuilds, t]
  );
  const unguildedCards = useMemo(
    () =>
      [...unguildedStudents]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((rosterStudent) => buildUnguildedStudentCard(t, rosterStudent)),
    [t, unguildedStudents]
  );
  const visibleLetters = groupedGuilds.map((group) => group.letter);
  const showAlphabetScrollbar =
    remainingGuilds.length >= ALPHABET_SCROLL_MIN_GUILDS &&
    visibleLetters.length >= ALPHABET_SCROLL_MIN_LETTERS;

  useEffect(() => {
    if (loading) return;

    const rawTarget = sessionStorage.getItem('eduquest_class_scroll_target');
    if (!rawTarget) return;

    sessionStorage.removeItem('eduquest_class_scroll_target');

    let target: { guildName?: string; memberId?: string } = {};
    try {
      target = JSON.parse(rawTarget) as typeof target;
    } catch {
      target = {};
    }

    scrollToClassTarget(target);
  }, [loading, groupedHands]);

  return (
    <GameLayout>
      <GameHeader currentView="class" />

      <div className="space-y-8">
        <h2 className="sr-only">{t('class.title')}</h2>

        <section aria-labelledby="class-podium-title" className="space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-status-campfire" size={22} aria-hidden />
            <h3 id="class-podium-title" className="text-xl font-bold">
              {t('class.podium')}
            </h3>
          </div>

          <div id="class-podium-hands-target" className="relative z-0 min-h-[94rem] overflow-visible" />
        </section>

        <div className="flex items-center gap-4" role="separator" aria-hidden>
          <div className="h-px flex-1 bg-gaming-border" />
          <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted">
            {t('class.remaining')}
          </span>
          <div className="h-px flex-1 bg-gaming-border" />
        </div>

        <motion.section
          layoutId="class-remaining-guilds-list"
          transition={{ layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } }}
          aria-labelledby="class-guilds-title"
          className="relative rounded-3xl border border-gaming-border bg-gaming-card/40 p-4 shadow-lg"
        >
          <div className="mb-4 flex items-center gap-3">
            <Users className="text-status-quest" size={22} aria-hidden />
            <h3 id="class-guilds-title" className="text-xl font-bold">
              {t('class.guilds')}
            </h3>
            <CompoundBadge
              parts={[loading ? t('common.loading') : `${remainingGuilds.length} ${t('class.guildCount')}`]}
            />
          </div>

          <div className={cn('space-y-6', showAlphabetScrollbar && 'pr-12')}>
            {groupedHands.map((group) => (
              <div key={group.letter} id={`guild-letter-${group.letter}`} className="scroll-mt-24 space-y-3">
                <h4 className="font-display text-sm font-bold uppercase tracking-[0.24em] text-status-campfire">
                  {group.letter}
                </h4>
                <div className="space-y-5">
                  {group.hands.map((hand) => (
                    <ClassHandSection
                      key={hand.id}
                      hand={hand}
                      isPlayerGuild={hand.title === playerGuild?.name}
                      currentGuildLabel={t('class.currentGuild')}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showAlphabetScrollbar ? (
            <AlphabetScrollbar letters={visibleLetters} ariaLabel={t('class.guildInitials')} />
          ) : null}
        </motion.section>

        {unguildedCards.length > 0 ? (
          <motion.section
            layoutId="class-unguilded-students-list"
            transition={{ layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } }}
            aria-labelledby="class-unguilded-title"
            className="rounded-3xl border border-gaming-border bg-gaming-card/40 p-4 shadow-lg"
          >
            <div className="mb-4 flex items-center gap-3">
              <UserRound className="text-status-campfire" size={22} aria-hidden />
              <h3 id="class-unguilded-title" className="text-xl font-bold">
                {t('class.unguildedTitle')}
              </h3>
              <CompoundBadge parts={[`${unguildedCards.length} ${t('class.studentCount')}`]} />
            </div>
            <p className="mb-5 max-w-3xl text-sm text-text-secondary">
              {t('class.unguildedHelp')}
            </p>
            <ResponsiveCardGrid
              items={unguildedCards}
              getKey={(card, index) => card.id || `unguilded-${index}`}
              renderItem={(card) => (
                <PlayingCard
                  {...card}
                  size="mini"
                  interactive={false}
                  className="mx-auto w-full max-w-xs"
                />
              )}
              className="md:grid-cols-3 2xl:grid-cols-4"
            />
          </motion.section>
        ) : null}
      </div>
    </GameLayout>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Unknown error';
}

function buildUnguildedStudentCard(
  t: (path: string) => string,
  rosterStudent: ClassRosterStudent
): PlayingCardData {
  const characterClass = rosterStudent.characterClass || 'scholar';
  const classLabel = t(`game.classes.${characterClass}`);
  const stats = rosterStudent.stats;

  return {
    id: `class-unguilded-${rosterStudent.id}`,
    layoutId: `class-unguilded-${rosterStudent.id}`,
    kind: 'character',
    characterClass,
    title: rosterStudent.displayName,
    subtitle: classLabel,
    illustrationUrl: rosterStudent.avatarUrl,
    illustrationAlt: rosterStudent.displayName,
    ribbonText: t('class.unguildedRibbon'),
    front: {
      title: rosterStudent.displayName,
      subtitle: rosterStudent.institutionalEmail || rosterStudent.email || classLabel,
      description: t('class.unguildedDescription'),
      illustrationUrl: rosterStudent.avatarUrl,
      illustrationAlt: rosterStudent.displayName,
      ribbonText: t('class.unguildedRibbon'),
      stats: stats
        ? [
            { id: 'strength', label: 'STR', value: stats.strength, max: 20 },
            { id: 'dexterity', label: 'DEX', value: stats.dexterity, max: 20 },
            { id: 'constitution', label: 'CON', value: stats.constitution, max: 20 },
            { id: 'intelligence', label: 'INT', value: stats.intelligence, max: 20 },
            { id: 'wisdom', label: 'WIS', value: stats.wisdom, max: 20 },
            { id: 'charisma', label: 'CHA', value: stats.charisma, max: 20 },
          ]
        : undefined,
    },
  };
}

function ClassHandSection({
  hand,
  isPlayerGuild,
  currentGuildLabel,
}: {
  hand: ReturnType<typeof buildClassGuildHand>;
  isPlayerGuild?: boolean;
  currentGuildLabel: string;
}) {
  return (
    <PlayingHandPanel
      hand={hand}
      id={`class-guild-${slugify(hand.title || 'guild')}`}
      className={cn(
        isPlayerGuild && 'border-status-quest shadow-glow-primary'
      )}
      badges={
        isPlayerGuild ? (
          <span className="rounded-full border border-status-quest px-2 py-0.5 text-xs font-bold text-status-quest">
            {currentGuildLabel}
          </span>
        ) : null
      }
    />
  );
}

function AlphabetScrollbar({ letters, ariaLabel }: { letters: string[]; ariaLabel: string }) {
  return (
    <nav
      aria-label={ariaLabel}
      className="sticky right-0 top-24 float-right -mr-1 -mt-10 flex max-h-[calc(100vh-8rem)] flex-col gap-1 rounded-full border border-gaming-border bg-gaming-card/90 p-1 shadow-xl backdrop-blur"
    >
      {letters.map((letter) => (
        <button
          type="button"
          key={letter}
          onClick={() => document.getElementById(`guild-letter-${letter}`)?.scrollIntoView({ behavior: 'smooth' })}
          className="flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold text-text-secondary transition hover:bg-gaming-base hover:text-status-quest focus:outline-none focus:ring-2 focus:ring-status-quest"
        >
          {letter}
        </button>
      ))}
    </nav>
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
      members: guild.members,
      createdAt: guild.createdAt || new Date().toISOString(),
      updatedAt: guild.updatedAt || new Date().toISOString(),
    } as ClassRosterGuild);
  });

  return Array.from(guildMap.values());
}

function sortByPointsThenName(a: ClassRosterGuild, b: ClassRosterGuild) {
  return (b.gold || 0) - (a.gold || 0) || sortByName(a, b);
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

function getGuildIdentityKey(guild: Partial<ClassRosterGuild>) {
  return slugify(guild.name || getGuildStableId(guild));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function scrollToClassTarget(target: { guildName?: string; memberId?: string }, attempts = 8) {
  const element = target.guildName
    ? document.getElementById(`class-guild-${slugify(target.guildName)}`)
    : document.getElementById('class-guilds-title');

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (attempts <= 0) return;
  window.setTimeout(() => scrollToClassTarget(target, attempts - 1), 80);
}

export default ClassPage;

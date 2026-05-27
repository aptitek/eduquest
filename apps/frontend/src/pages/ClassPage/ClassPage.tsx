import { useEffect, useMemo, useState } from 'react';
import type { Guild } from '@eduquest/shared';
import { motion } from 'framer-motion';
import { Trophy, Users } from 'lucide-react';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { CompoundBadge } from '../../components/atoms/CompoundBadge';
import { PlayingHand } from '../../components/molecules/PlayingCard';
import { fetchGuilds } from '../../features/game/api';
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
  const [guilds, setGuilds] = useState<Guild[]>([]);
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
        const apiGuilds = await fetchGuilds(token, selectedGameId);
        if (isMounted) setGuilds(apiGuilds);
      } catch (error) {
        console.warn('Could not load class guilds.', error);
        if (isMounted) setGuilds([]);
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
  const visibleLetters = groupedGuilds.map((group) => group.letter);
  const showAlphabetScrollbar =
    remainingGuilds.length >= ALPHABET_SCROLL_MIN_GUILDS &&
    visibleLetters.length >= ALPHABET_SCROLL_MIN_LETTERS;

  return (
    <GameLayout>
      <GameHeader currentView="class" />

      <div className="space-y-8 pb-8 pt-4">
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
      </div>
    </GameLayout>
  );
}

function ClassHandSection({
  hand,
  rank,
  isPlayerGuild,
  currentGuildLabel,
}: {
  hand: ReturnType<typeof buildClassGuildHand>;
  rank?: number;
  isPlayerGuild?: boolean;
  currentGuildLabel: string;
}) {
  return (
    <section
      aria-label={hand.title}
      className={cn(
        'relative overflow-visible rounded-3xl border border-gaming-border bg-gaming-base/40 p-4 shadow-lg',
        isPlayerGuild && 'border-status-quest shadow-glow-primary'
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {rank ? (
          <span className="rounded-full bg-status-campfire px-2 py-0.5 text-xs font-black text-gaming-base">
            #{rank}
          </span>
        ) : null}
        {isPlayerGuild ? (
          <span className="rounded-full border border-status-quest px-2 py-0.5 text-xs font-bold text-status-quest">
            {currentGuildLabel}
          </span>
        ) : null}
        <h4 className="truncate font-display text-lg font-bold">{hand.title}</h4>
      </div>

      <PlayingHand
        hand={hand}
        mode="full"
        visibleCardCount={hand.cards.length}
        expandOnHover={false}
        className="mx-auto h-[28rem] min-h-0 max-w-7xl md:h-[30rem]"
        cardClassName="shadow-glow-primary"
      />
    </section>
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

function groupGuildsByInitial(guilds: Guild[]) {
  const groups = guilds.reduce<Record<string, Guild[]>>((accumulator, guild) => {
    const letter = getGuildInitial(guild);
    accumulator[letter] = accumulator[letter] || [];
    accumulator[letter].push(guild);
    return accumulator;
  }, {});

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, groupGuilds]) => ({ letter, guilds: groupGuilds }));
}

function mergeGuilds(primaryGuilds: readonly Partial<Guild>[], secondaryGuilds: readonly Guild[]) {
  const guildMap = new Map<string, Guild>();

  [...primaryGuilds, ...secondaryGuilds].forEach((guild) => {
    if (!guild.name) return;
    guildMap.set(getGuildIdentityKey(guild), {
      id: getGuildStableId(guild),
      name: guild.name,
      cohortId: guild.cohortId || 'demo',
      description: guild.description,
      iconUrl: guild.iconUrl,
      color: guild.color,
      gold: guild.gold || 0,
      createdAt: guild.createdAt || new Date().toISOString(),
      updatedAt: guild.updatedAt || new Date().toISOString(),
    } as Guild);
  });

  return Array.from(guildMap.values());
}

function sortByPointsThenName(a: Guild, b: Guild) {
  return (b.gold || 0) - (a.gold || 0) || sortByName(a, b);
}

function sortByName(a: Guild, b: Guild) {
  return a.name.localeCompare(b.name);
}

function getGuildInitial(guild: Guild) {
  return guild.name.trim().charAt(0).toLocaleUpperCase() || '#';
}

function getGuildStableId(guild: Partial<Guild>) {
  return guild.id || slugify(guild.name || 'guild');
}

function getGuildIdentityKey(guild: Partial<Guild>) {
  return slugify(guild.name || getGuildStableId(guild));
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default ClassPage;

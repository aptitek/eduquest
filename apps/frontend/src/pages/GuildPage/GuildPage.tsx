import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import { formatUserDisplayName } from '../../utils/displayName';
import mascotUrl from '../../assets/mascot.svg';
import {
  RIVAL_GUILDS,
  buildMockGuildCardHands,
  getLatestCohortMembership,
} from '../../components/organisms/DashboardDock/dashboardDockData';
import { PlayingHandPage } from '../PlayingHandPage/PlayingHandPage';

export function GuildPage() {
  const { t } = useTranslation();
  const { user, student, character } = useGameStore();

  if (!student || !character) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-text-muted">
        {t('layout.loadingSession')}
      </div>
    );
  }

  const latestMembership = getLatestCohortMembership(student.cohortMemberships);
  const playerGuild = latestMembership?.guild || RIVAL_GUILDS[0];
  const guildName = playerGuild.name || t('dashboard.dock.playerGuild');
  const playerName = user ? formatUserDisplayName(user) : t('dashboard.dock.player');
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;
  const hands = buildMockGuildCardHands(t, {
    guild: playerGuild,
    guildName,
    playerName,
    playerAvatar,
    characterLevel: character.currentLevel,
    characterClassLabel: t(`game.classes.${character.characterClass}`),
    activeCardIndex: 0,
  });

  return (
    <PlayingHandPage
      title={t('guild.title')}
      subtitle={t('guild.subtitle').replace('{guildName}', guildName)}
      hands={hands}
      currentView="guild"
      emptyState={t('guild.emptyState')}
    />
  );
}

export default GuildPage;

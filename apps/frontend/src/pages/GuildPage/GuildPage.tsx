import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import {
  getLatestCohortMembership,
} from '../../components/organisms/DashboardDock/dashboardDockData';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';

export function GuildPage() {
  const { t } = useTranslation();
  const { student, character, selectedGameId } = useGameStore();

  if (!student || !character) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-text-muted">
        {t('layout.loadingSession')}
      </div>
    );
  }

  const latestMembership =
    (selectedGameId &&
      student.cohortMemberships?.find((membership) => membership.cohortId === selectedGameId)) ||
    getLatestCohortMembership(student.cohortMemberships);
  const playerGuild = latestMembership?.guild;

  if (!playerGuild) {
    return (
      <GameLayout>
        <GameHeader currentView="guild" />
        <div className="rounded-3xl border border-gaming-border bg-gaming-card/70 p-10 text-center font-display text-text-muted">
          {t('guild.emptyState')}
        </div>
      </GameLayout>
    );
  }

  const guildName = playerGuild.name || t('dashboard.dock.playerGuild');

  return (
    <GameLayout>
      <GameHeader currentView="guild" />

      <div className="pb-8 pt-4">
        <h2 className="sr-only">{t('guild.title')}</h2>
        <section
          aria-label={t('guild.subtitle').replace('{guildName}', guildName)}
          className="overflow-visible rounded-3xl border border-gaming-border bg-gaming-base/40 p-2 shadow-2xl md:p-4"
        >
          <div id="guild-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
        </section>
      </div>
    </GameLayout>
  );
}

export default GuildPage;

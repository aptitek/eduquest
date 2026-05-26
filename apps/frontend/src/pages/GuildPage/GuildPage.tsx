import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import {
  RIVAL_GUILDS,
  getLatestCohortMembership,
} from '../../components/organisms/DashboardDock/dashboardDockData';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';

export function GuildPage() {
  const { t } = useTranslation();
  const { student, character } = useGameStore();

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

  return (
    <GameLayout>
      <GameHeader currentView="guild" />

      <main className="pb-8 pt-4">
        <h2 className="sr-only">{t('guild.title')}</h2>
        <section
          aria-label={t('guild.subtitle').replace('{guildName}', guildName)}
          className="overflow-visible rounded-3xl border border-gaming-border bg-gaming-base/40 p-2 shadow-2xl md:p-4"
        >
          <div id="guild-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
        </section>
      </main>
    </GameLayout>
  );
}

export default GuildPage;

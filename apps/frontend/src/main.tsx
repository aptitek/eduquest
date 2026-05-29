import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import '@xyflow/react/dist/style.css';
import { MapPage } from './pages/MapPage/MapPage';
import { AnnuairePage } from './pages/AnnuairePage';
import { ProgressPage } from './pages/ProgressPage/ProgressPage';
import { CharacterPage } from './pages/CharacterPage/CharacterPage';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { ManagementPage } from './pages/ManagementPage/ManagementPage';
import { GameHeader } from './components/organisms/GameHeader';
import { GameLayout } from './components/templates/GameLayout';
import { useAuth } from './features/auth/useAuth';
import { useGameStore } from './features/game/gameStore';
import { useTranslation } from './hooks/useTranslation';
import { LayoutGroup, motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { ErrorNotificationProvider } from './features/errors/notifications';
import { MissingTranslationHighlighter } from './features/debug/MissingTranslationHighlighter';

const savedTheme = localStorage.getItem('eduquest_theme');
document.documentElement.dataset.theme =
  savedTheme === 'dark' || savedTheme === 'light'
    ? savedTheme
    : window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';

function getHashRoute() {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === 'guild' || route === 'class') return 'annuaire';
  return route === 'progress' ? 'bonus' : route;
}

function App() {
  const { t } = useTranslation();
  const auth = useAuth();
  const { user, student, character, loadingSession } = auth;
  const selectedGameId = useGameStore((state) => state.selectedGameId);
  const [route, setRoute] = React.useState(getHashRoute);

  React.useEffect(() => {
    const handleHashChange = () => setRoute(getHashRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-gaming-base flex flex-col justify-center items-center gap-6 relative font-display">
        {/* Glowing Retro Splash Symbol */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 360],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'easeInOut',
          }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-status-quest to-status-boss flex items-center justify-center shadow-lg border border-status-boss/20 text-solarized-base3"
        >
          <Gamepad2 size={32} />
        </motion.div>

        {/* Loading Message */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-primary via-solarized-blue to-status-boss tracking-wider">
            {t('layout.title').toUpperCase()}
          </h2>
          <span className="text-xs text-status-campfire font-semibold uppercase tracking-widest animate-pulse">
            {t('layout.loadingSession')}
          </span>
        </div>

        {/* Pulsing Game Console Loading Line */}
        <div className="w-48 h-[2px] bg-gaming-border rounded-full overflow-hidden relative border border-gaming-border">
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'linear',
            }}
            className="w-24 h-full bg-gradient-to-r from-transparent via-status-boss to-transparent absolute"
          />
        </div>
      </div>
    );
  }

  // Force authentication to access the app
  if (!user) {
    return <LoginPage auth={auth} />;
  }

  if (route === 'management' && user.isAdmin) {
    return <ManagementPage />;
  }

  if (user.isAdmin && route === 'character') {
    return <MapPage />;
  }

  const selectedMembership =
    (selectedGameId && student?.cohortMemberships?.find((membership) => membership.cohortId === selectedGameId)) ||
    student?.cohortMemberships?.[0];
  const hasCohortAssignment = Boolean(selectedMembership?.cohortId);

  if (!user.isAdmin && student && !hasCohortAssignment) {
    return <CohortAssignmentRequiredPage />;
  }

  if (route === 'character' && !user.isAdmin && student && hasCohortAssignment && !character) {
    return <CharacterPage />;
  }

  if (route === 'annuaire') {
    return <AnnuairePage />;
  }

  if (route === 'bonus') {
    return <ProgressPage />;
  }

  if (route === 'character') {
    return <CharacterPage />;
  }

  return <MapPage />;
}

function CohortAssignmentRequiredPage() {
  const { t } = useTranslation();

  return (
    <GameLayout hideDashboard>
      <GameHeader hideNavigation />
      <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-10">
        <div className="max-w-lg rounded-3xl border border-gaming-border bg-gaming-card/90 p-8 text-center shadow-card">
          <p className="font-display text-xl font-black text-text-primary">
            {t('assignmentRequired.title')}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {t('assignmentRequired.description')}
          </p>
        </div>
      </section>
    </GameLayout>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorNotificationProvider>
      <LayoutGroup id="eduquest-cards">
        <App />
      </LayoutGroup>
      <MissingTranslationHighlighter />
    </ErrorNotificationProvider>
  </React.StrictMode>
);

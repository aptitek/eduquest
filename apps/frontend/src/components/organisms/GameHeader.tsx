import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { AccountDropdown } from './AccountDropdown';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { EditableFieldContext, EditableText } from '../atoms/EditableText';
import { InfoBar } from '../molecules/InfoBar';
import { PlayingCard } from '../molecules/PlayingCard';
import { useAuth } from '../../features/auth/useAuth';
import { fetchSelectableGames } from '../../features/game/api';
import { useCohortProgressData } from '../../features/game/useCohortProgressData';
import { useGameStore } from '../../features/game/gameStore';
import {
  HeaderNotificationArea,
  HeaderNotificationButton,
  type HeaderNotification,
} from './HeaderNotificationArea';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import { useErrorReporter } from '../../features/errors/notifications';
import {
  formatRewardNotificationDescription,
  formatRewardNotificationTitle,
} from '../../features/game/formatRewardNotification';
import { Check, ChevronDown, Coins, Gift, GraduationCap, Map, Megaphone, Settings, Sparkles, Users } from 'lucide-react';
import iconUrl from '../../assets/icon.svg';

interface GameHeaderProps {
  currentView?: 'map' | 'management' | 'guild' | 'class' | 'progress' | 'character';
}

export function GameHeader({ currentView = 'map' }: GameHeaderProps) {
  const { user, character } = useAuth();
  const {
    availableGames,
    selectedGameId,
    setAvailableGames,
    setSelectedGameId,
  } = useGameStore();
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const showHeaderError = useCallback((messageKey: string, error: unknown) => {
    reportError(error, { messageKey, id: messageKey });
  }, [reportError]);
  const handleDashboardError = useCallback(
    (error: unknown) => showHeaderError('header.errors.loadDashboard', error),
    [showHeaderError]
  );
  const dashboardData = useCohortProgressData(
    !user?.isAdmin,
    selectedGameId,
    handleDashboardError
  );

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [gameMenuPosition, setGameMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const gameMenuButtonRef = useRef<HTMLButtonElement>(null);
  const gameMenuRef = useRef<HTMLUListElement | null>(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(
    () => new Set()
  );
  const [adminNotificationTitle, setAdminNotificationTitle] = useState('');
  const [adminNotificationDescription, setAdminNotificationDescription] = useState('');
  const [adminCohortNotifications, setAdminCohortNotifications] = useState<HeaderNotification[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isGameMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (gameMenuButtonRef.current?.contains(target) || gameMenuRef.current?.contains(target)) return;
      setIsGameMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsGameMenuOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGameMenuOpen]);

  useEffect(() => {
    if (!user) return undefined;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    fetchSelectableGames(token, selectedGameId)
      .then(({ games, selectedGameId: nextSelectedGameId }) => {
        if (!isMounted) return;

        setAvailableGames(games);
        const currentSelectionStillExists = Boolean(
          selectedGameId && games.some((game) => game.id === selectedGameId)
        );
        const fallbackSelection = nextSelectedGameId || games[0]?.id || null;
        if (!currentSelectionStillExists && selectedGameId !== fallbackSelection) {
          setSelectedGameId(fallbackSelection);
        }
      })
      .catch((error) => {
        console.warn('Could not load selectable games.', error);
        showHeaderError('header.errors.loadGames', error);
        if (isMounted) setAvailableGames([]);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.isAdmin]);

  const dashboardNotifications: HeaderNotification[] = dashboardData?.notifications.length
    ? dashboardData.notifications.map((notification) => ({
        id: notification.id,
        title:
          notification.context?.type === 'reward'
            ? formatRewardNotificationTitle(notification.context, t)
            : t(notification.titleI18nKey),
        description:
          notification.context?.type === 'reward'
            ? formatRewardNotificationDescription(notification.context, t)
            : notification.descriptionI18nKey
              ? t(notification.descriptionI18nKey)
              : undefined,
        tone: notification.tone,
        icon: getNotificationIcon(notification.icon),
        action: notification.actionLabelI18nKey
          ? {
              label: t(notification.actionLabelI18nKey),
              onSelect: () => runNotificationAction(notification.actionTarget),
            }
          : undefined,
      }))
    : [];
  const allNotifications = [...adminCohortNotifications, ...dashboardNotifications];
  const activeNotifications = allNotifications.filter(
    (notification) => !dismissedNotificationIds.has(notification.id)
  );

  const dismissNotification = (id: string) => {
    setDismissedNotificationIds((current) => new Set(current).add(id));
  };
  const showGameSelector = user?.isAdmin ? availableGames.length > 0 : availableGames.length > 1;
  const selectedGame = availableGames.find((game) => game.id === selectedGameId);
  const addAdminCohortNotification = () => {
    const title = adminNotificationTitle.trim();
    const description = adminNotificationDescription.trim();
    if (!title && !description) return;

    setAdminCohortNotifications((current) => [
      {
        id: `admin-cohort-${Date.now()}`,
        title: title || t('dashboard.notifications.draftTitle'),
        description: description || undefined,
        meta: selectedGame?.name || t('dashboard.notifications.cohortWide'),
        icon: <Megaphone size={18} aria-hidden />,
        tone: 'info',
      },
      ...current,
    ]);
    setAdminNotificationTitle('');
    setAdminNotificationDescription('');
    setIsNotificationDrawerOpen(true);
  };
  const adminNotificationComposer =
    user?.isAdmin && currentView === 'management' ? (
      <EditableFieldContext.Provider value={{ showPencil: true }}>
        <InfoBar
          tone="info"
          icon={<Megaphone size={18} aria-hidden />}
          title={
            <EditableText
              value={adminNotificationTitle}
              onChange={setAdminNotificationTitle}
              placeholder={t('dashboard.notifications.draftTitle')}
              className="font-display text-sm font-black text-text-primary"
              truncate={false}
            />
          }
          description={
            <EditableText
              value={adminNotificationDescription}
              onChange={setAdminNotificationDescription}
              placeholder={t('dashboard.notifications.draftDescription')}
              className="text-xs leading-relaxed text-text-secondary"
              multiline
              truncate={false}
            />
          }
          meta={selectedGame?.name || t('dashboard.notifications.cohortWide')}
          action={{
            label: t('dashboard.notifications.addCohortNotification'),
            onSelect: addAdminCohortNotification,
          }}
          className="border-dashed"
        />
      </EditableFieldContext.Provider>
    ) : undefined;
  const openGameMenu = () => {
    const rect = gameMenuButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setGameMenuPosition({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(window.innerWidth - 264, rect.right - 256)),
      });
    }
    setIsGameMenuOpen((current) => !current);
  };
  const gameMenu =
    showGameSelector && isGameMenuOpen && gameMenuPosition
      ? createPortal(
          <ul
            ref={(node) => {
              gameMenuRef.current = node;
              if (!node) return;
              node.style.top = `${gameMenuPosition.top}px`;
              node.style.left = `${gameMenuPosition.left}px`;
            }}
            className="menu fixed z-[100] w-64 rounded-box border border-gaming-border bg-gaming-card p-2 font-display text-xs font-bold uppercase tracking-[0.12em] text-text-secondary shadow-xl"
          >
            {availableGames.map((game) => {
              const isSelected = game.id === selectedGameId;

              return (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGameId(game.id);
                      setIsGameMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition',
                      isSelected ? 'bg-gaming-base text-status-quest' : 'hover:bg-gaming-base hover:text-text-primary'
                    )}
                  >
                    <span className="truncate">{game.name}</span>
                    {isSelected ? <Check size={14} aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;
  const gameSelector = showGameSelector ? (
    <>
      <button
        ref={gameMenuButtonRef}
        type="button"
        title={selectedGame?.name || t('header.changeGame')}
        onClick={openGameMenu}
        className="flex h-full items-center justify-center border-r border-gaming-border px-2 text-text-secondary transition hover:bg-gaming-base hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-status-quest"
        aria-expanded={isGameMenuOpen}
        aria-haspopup="menu"
        aria-label={t('header.changeGame')}
      >
        <ChevronDown
          size={16}
          className={cn('transition-transform', isGameMenuOpen && 'rotate-180')}
          aria-hidden
        />
      </button>
      {gameMenu}
    </>
  ) : null;

  return (
    <header className="relative z-50 flex w-full flex-col gap-2">
      <div className="flex min-h-16 flex-wrap justify-between gap-y-2 rounded-lg border border-gaming-border bg-gaming-card text-xs shadow-md lg:flex-nowrap">
        {/* Partie Gauche : Logo & Version */}
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          <div className="flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-lg bg-gaming-base flex items-center justify-center shadow-md overflow-hidden p-1 border border-gaming-border">
              <img src={iconUrl} alt={t('layout.appIconAlt')} className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
              {t('layout.title')}{' '}
              <span className="text-xs text-status-boss font-normal">{t('layout.alpha')}</span>
            </h1>
          </div>

          <nav className="flex min-w-max border-l border-gaming-border" aria-label={t('layout.primaryNav')}>
            <button
              type="button"
              aria-current={currentView === 'map' ? 'page' : undefined}
              onClick={() => {
                window.location.hash = '';
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                currentView === 'map' && 'bg-gaming-base text-status-quest'
              )}
            >
              <Map size={16} aria-hidden />
              {t('map.nav')}
            </button>

            {!user?.isAdmin ? (
              <>
                <button
                  type="button"
                  aria-current={currentView === 'guild' ? 'page' : undefined}
                  onClick={() => {
                    window.location.hash = 'guild';
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                    currentView === 'guild' && 'bg-gaming-base text-status-quest'
                  )}
                >
                  <Users size={16} aria-hidden />
                  {t('guild.nav')}
                </button>

                <button
                  type="button"
                  aria-current={currentView === 'class' ? 'page' : undefined}
                  onClick={() => {
                    window.location.hash = 'class';
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                    !gameSelector && 'border-r border-gaming-border',
                    currentView === 'class' && 'bg-gaming-base text-status-quest'
                  )}
                >
                  <GraduationCap size={16} aria-hidden />
                  {t('class.nav')}
                </button>

                {gameSelector}

                <button
                  type="button"
                  aria-current={currentView === 'progress' ? 'page' : undefined}
                  onClick={() => {
                    window.location.hash = 'progress';
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                    currentView === 'progress' && 'bg-gaming-base text-status-quest'
                  )}
                >
                  <Gift size={16} aria-hidden />
                  {t('progress.nav')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-current={currentView === 'class' ? 'page' : undefined}
                  onClick={() => {
                    window.location.hash = 'class';
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                    !gameSelector && 'border-r border-gaming-border',
                    currentView === 'class' && 'bg-gaming-base text-status-quest'
                  )}
                >
                  <GraduationCap size={16} aria-hidden />
                  {t('class.nav')}
                </button>

                {gameSelector}

                <button
                  type="button"
                  aria-current={currentView === 'progress' ? 'page' : undefined}
                  onClick={() => {
                    window.location.hash = 'progress';
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                    currentView === 'progress' && 'bg-gaming-base text-status-quest'
                  )}
                >
                  <Gift size={16} aria-hidden />
                  {t('progress.nav')}
                </button>
              </>
            )}

            {user?.isAdmin && (
              <button
                type="button"
                aria-current={currentView === 'management' ? 'page' : undefined}
                onClick={() => {
                  window.location.hash = 'management';
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                  currentView === 'management' && 'bg-gaming-base text-status-quest'
                )}
              >
                <Settings size={16} aria-hidden />
                {t('management.nav')}
              </button>
            )}
          </nav>
        </div>

        {/* Partie Droite : Character, Account & Notifications */}
        <div className="flex shrink-0 items-center gap-3 px-4">
          {!isOnline && (
            <div className="tooltip tooltip-left" data-tip={t('header.connectionLost')}>
              <StatusIndicator status="error" isPulsing={true} />
            </div>
          )}
          {user && character ? (
            <div className="relative h-12 w-[2.15rem] overflow-visible">
              <PlayingCard
                size="nano"
                kind="character"
                title={formatUserDisplayName(user)}
                ribbonLabel={t(`game.classes.${character.characterClass}`)}
                characterClass={character.characterClass}
                illustrationUrl={user.avatarUrl || user.githubAvatarUrl}
                illustrationAlt={formatUserDisplayName(user)}
                interactive
                onClick={() => {
                  window.location.hash = 'character';
                }}
                className="absolute left-1/2 top-0 -translate-x-1/2"
              />
            </div>
          ) : null}
          <AccountDropdown />
          <HeaderNotificationButton
            count={activeNotifications.length}
            isOpen={isNotificationDrawerOpen}
            onClick={() => setIsNotificationDrawerOpen((current) => !current)}
          />
        </div>
      </div>

      <HeaderNotificationArea
        notifications={activeNotifications}
        isOpen={isNotificationDrawerOpen}
        isExpanded
        composer={adminNotificationComposer}
        onDismiss={dismissNotification}
        onAction={dismissNotification}
        className="sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[28rem] sm:max-w-full"
      />
    </header>
  );
}

function getNotificationIcon(icon?: string) {
  if (icon === 'map') return <Map size={18} />;
  if (icon === 'sparkles') return <Sparkles size={18} />;
  if (icon === 'coins') return <Coins size={18} />;
  if (icon === 'gift') return <Gift size={18} />;
  return undefined;
}

function runNotificationAction(actionTarget?: string) {
  if (actionTarget === 'map') {
    window.location.hash = '';
  }
}

export default GameHeader;

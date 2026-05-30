import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Clipboard } from 'lucide-react';
import { ApiClientError, getUserErrorMessage } from './api';
import { useTranslation } from '../../hooks/useTranslation';
import { HeaderNotificationArea, type HeaderNotification } from '../../components/organisms/HeaderNotificationArea';

type ErrorReporterOptions = {
  messageKey?: string;
  fallback?: string;
  id?: string;
  logMessage?: string;
  includeDetail?: boolean;
};

type ErrorReporter = (error: unknown, options?: ErrorReporterOptions) => void;

const ErrorReporterContext = createContext<ErrorReporter | null>(null);
const MAX_VISIBLE_ERROR_NOTIFICATIONS = 5;

export function ErrorNotificationProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);

  const reportError = useCallback<ErrorReporter>(
    (error, options = {}) => {
      const detail = getUserErrorMessage(error, t);
      const message = buildNotificationMessage({
        template: options.messageKey ? t(options.messageKey) : options.fallback,
        fallback: options.fallback,
        detail,
        includeDetail: options.includeDetail,
      });
      const logMessage = options.logMessage || options.messageKey || 'Application error';
      const id = options.id || options.messageKey || detail;
      const debugLog = formatErrorDebugLog({
        error,
        id,
        logMessage,
        message,
        detail,
        options,
      });
      const notification: HeaderNotification = {
        id,
        title: isNotEnoughGoldForBoost(detail) ? t('errors.notificationNoticeTitle') : t('errors.notificationTitle'),
        description: (
          <ErrorNotificationDescription
            message={message}
            debugLog={debugLog}
            summaryLabel={t('errors.debugLogSummary')}
            copyLabel={t('errors.copyDebugLog')}
            copiedLabel={t('errors.copiedDebugLog')}
            copyFailedLabel={t('errors.copyDebugLogFailed')}
            showDebugLog={!isNotEnoughGoldForBoost(detail)}
          />
        ),
        tone: isNotEnoughGoldForBoost(detail) ? 'warning' : 'danger',
      };

      console.warn(logMessage, error);
      setNotifications((current) => [
        notification,
        ...current.filter((notification) => notification.id !== id),
      ].slice(0, MAX_VISIBLE_ERROR_NOTIFICATIONS));
    },
    [t]
  );

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportError(event.error || event.message, {
        fallback: t('errors.unexpected'),
        id: 'global-error',
        logMessage: 'Unhandled browser error',
        includeDetail: false,
      });
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, {
        fallback: t('errors.unexpected'),
        id: 'global-promise-rejection',
        logMessage: 'Unhandled promise rejection',
        includeDetail: false,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [reportError, t]);

  return (
    <ErrorReporterContext.Provider value={reportError}>
      {children}
      <GlobalErrorNotificationArea
        notifications={notifications}
        onDismiss={(id) => {
          setNotifications((current) => current.filter((notification) => notification.id !== id));
        }}
      />
    </ErrorReporterContext.Provider>
  );
}

export function useErrorReporter() {
  const reporter = useContext(ErrorReporterContext);
  if (!reporter) {
    throw new Error('useErrorReporter must be used within ErrorNotificationProvider.');
  }
  return reporter;
}

function buildNotificationMessage({
  template,
  fallback,
  detail,
  includeDetail = true,
}: {
  template?: string;
  fallback?: string;
  detail: string;
  includeDetail?: boolean;
}) {
  const resolvedTemplate = template && template !== fallback ? template : fallback;
  if (!resolvedTemplate) return detail;
  if (resolvedTemplate.includes('{detail}')) {
    return resolvedTemplate.split('{detail}').join(includeDetail ? detail : '').replace(/\s+/g, ' ').trim();
  }
  if (!includeDetail) return resolvedTemplate;
  return `${resolvedTemplate} ${detail}`;
}

function ErrorNotificationDescription({
  message,
  debugLog,
  summaryLabel,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  showDebugLog = true,
}: {
  message: string;
  debugLog: string;
  summaryLabel: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
  showDebugLog?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resolvedCopyLabel =
    copyStatus === 'copied'
      ? copiedLabel
      : copyStatus === 'failed'
        ? copyFailedLabel
        : copyLabel;

  const copyDebugLog = async () => {
    try {
      await navigator.clipboard.writeText(debugLog);
      setCopyStatus('copied');
    } catch (error) {
      console.warn('Could not copy error debug log.', error);
      setCopyStatus('failed');
    } finally {
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    }
  };

  return (
    <div className="space-y-2">
      <p>{message}</p>
      {showDebugLog ? <details className="group rounded-xl border border-status-danger/25 bg-gaming-base/50 px-3 py-2">
        <summary className="cursor-pointer select-none font-display text-[0.66rem] font-black uppercase tracking-[0.14em] text-status-danger">
          {summaryLabel}
        </summary>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={copyDebugLog}
            aria-label={resolvedCopyLabel}
            title={resolvedCopyLabel}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-status-danger/35 bg-status-danger/10 text-status-danger transition hover:bg-status-danger/20 focus:outline-none focus:ring-2 focus:ring-status-danger/40"
          >
            <Clipboard size={15} aria-hidden />
          </button>
        </div>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gaming-base/90 p-2 font-mono text-[0.68rem] leading-relaxed text-status-danger">
          {debugLog}
        </pre>
      </details> : null}
    </div>
  );
}

function isNotEnoughGoldForBoost(detail: string) {
  return detail === 'La guilde n’a pas assez d’or pour lancer ce boost.';
}

function formatErrorDebugLog({
  error,
  id,
  logMessage,
  message,
  detail,
  options,
}: {
  error: unknown;
  id: string;
  logMessage: string;
  message: string;
  detail: string;
  options: ErrorReporterOptions;
}) {
  const lines = [
    `Timestamp: ${new Date().toISOString()}`,
    `Notification ID: ${id}`,
    `Context: ${logMessage}`,
    `User message: ${message}`,
    `Resolved detail: ${detail}`,
  ];

  if (options.messageKey) lines.push(`Message key: ${options.messageKey}`);
  if (options.fallback) lines.push(`Fallback: ${options.fallback}`);

  if (error instanceof ApiClientError) {
    lines.push(`Error type: ${error.name}`);
    lines.push(`HTTP status: ${error.status}`);
    lines.push(`Error code: ${error.errorCode}`);
    if (error.errorKey) lines.push(`Error key: ${error.errorKey}`);
    if (error.payload) lines.push(`Payload: ${safeStringify(error.payload)}`);
  } else if (error instanceof Error) {
    lines.push(`Error type: ${error.name}`);
  } else {
    lines.push(`Error type: ${typeof error}`);
  }

  if (error instanceof Error) {
    lines.push(`Error message: ${error.message}`);
    if (error.stack) lines.push(`Stack:\n${error.stack}`);
  } else {
    lines.push(`Raw error: ${safeStringify(error)}`);
  }

  return lines.join('\n');
}

function safeStringify(value: unknown) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function GlobalErrorNotificationArea({
  notifications,
  onDismiss,
}: {
  notifications: HeaderNotification[];
  onDismiss: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] w-[min(28rem,calc(100vw-2rem))]">
      <HeaderNotificationArea
        notifications={notifications}
        isOpen
        isExpanded
        visibleLimit={MAX_VISIBLE_ERROR_NOTIFICATIONS}
        onDismiss={onDismiss}
        className="pointer-events-auto"
      />
    </div>
  );
}

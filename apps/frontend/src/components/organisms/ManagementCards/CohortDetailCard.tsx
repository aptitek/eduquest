import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { type CohortGrade } from '@eduquest/shared';
import { Clipboard, ExternalLink, LockKeyhole, UnlockKeyhole, X } from 'lucide-react';
import { AddButton } from '../../atoms/AddButton';
import { DeleteButton } from '../../atoms/DeleteButton';
import { BadgeDropdown } from '../../molecules/BadgeDropdown';
import { EditableFieldContext, EditableText } from '../../atoms/EditableText';
import {
  createManagementCohortInvite,
  fetchManagementCohortInvites,
  revokeManagementCohortInvite,
  type ManagementCohortUpdate,
  type ManagementCohortInvite,
} from '../../../features/management/api';
import type { CohortRow } from '../../../features/management/types';
import { formatGrade } from '../../../features/management/utils';
import aptitekLogoUrl from '../../../assets/logo.svg';
import { keepFocusInContainer } from '../../../utils/focusTrap';
import { useErrorReporter } from '../../../features/errors/notifications';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const COHORT_GRADES: CohortGrade[] = ['licence', 'bachelor', 'engineer', 'master', 'doctorate'];

function formatTimeRemaining(expiresAt: string, t: (key: string) => string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return t('management.cohorts.expired');

  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / HOUR_MS);
  const minutes = Math.max(1, Math.floor((remainingMs % HOUR_MS) / MINUTE_MS));
  const parts: string[] = [];

  if (days > 0)
    parts.push(
      `${days} ${days === 1 ? t('management.cohorts.day') : t('management.cohorts.days')}`
    );
  if (hours > 0) {
    parts.push(
      `${hours} ${hours === 1 ? t('management.cohorts.hour') : t('management.cohorts.hours')}`
    );
  }
  if (days === 0 && hours === 0) {
    parts.push(
      `${minutes} ${minutes === 1 ? t('management.cohorts.minute') : t('management.cohorts.minutes')}`
    );
  }

  return `${t('management.cohorts.expiresIn')} ${parts.join(` ${t('management.cohorts.and')} `)}`;
}

export function CohortDetailCard({
  cohort,
  cohortOptions,
  campusOptions,
  onUpdate,
  t,
}: {
  cohort: CohortRow;
  cohortOptions: CohortRow[];
  campusOptions: string[];
  onUpdate?: (update: ManagementCohortUpdate) => void | Promise<void>;
  t: (key: string) => string;
}) {
  const reportError = useErrorReporter();
  const [draft, setDraft] = useState({
    campusName: cohort.campusName,
    name: cohort.name,
    description: cohort.description || '',
    startYear: String(cohort.startYear),
    grade: formatGrade(cohort.grade),
    level: String(cohort.level),
    majorSpeciality: cohort.majorSpeciality || '',
    minorSpeciality: cohort.minorSpeciality || '',
  });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invites, setInvites] = useState<ManagementCohortInvite[]>([]);
  const [selectedInvite, setSelectedInvite] = useState<ManagementCohortInvite | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [isRegistrationUpdating, setIsRegistrationUpdating] = useState(false);
  const [hasCopiedInvite, setHasCopiedInvite] = useState(false);
  const [isQrFullscreenOpen, setIsQrFullscreenOpen] = useState(false);
  const inviteDialogRef = useRef<HTMLDivElement>(null);
  const qrDialogRef = useRef<HTMLDivElement>(null);
  const resolvedLogoUrl =
    cohort.school?.logoUrl || (cohort.schoolName === 'Aptitek' ? aptitekLogoUrl : undefined);
  const schoolYearOptions = Array.from(
    new Set([String(cohort.startYear), ...cohortOptions.map((item) => String(item.startYear))])
  );
  const gradeOptions = ['Licence', 'Bachelor', 'Engineer', 'Master', 'Doctorate'];
  const levelOptions = ['1', '2', '3', '4', '5'];
  const majorOptions = Array.from(
    new Set(
      [cohort.majorSpeciality, ...cohortOptions.map((item) => item.majorSpeciality)].filter(
        (value): value is string => Boolean(value)
      )
    )
  );
  const minorOptions = Array.from(
    new Set(
      [cohort.minorSpeciality, ...cohortOptions.map((item) => item.minorSpeciality)].filter(
        (value): value is string => Boolean(value)
      )
    )
  );

  useEffect(() => {
    setDraft({
      campusName: cohort.campusName,
      name: cohort.name,
      description: cohort.description || '',
      startYear: String(cohort.startYear),
      grade: formatGrade(cohort.grade),
      level: String(cohort.level),
      majorSpeciality: cohort.majorSpeciality || '',
      minorSpeciality: cohort.minorSpeciality || '',
    });
    setInvites([]);
    setSelectedInvite(null);
    setInviteError(null);
    setHasCopiedInvite(false);
    setIsQrFullscreenOpen(false);
  }, [cohort]);

  useEffect(() => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    let isMounted = true;
    fetchManagementCohortInvites(token, cohort.id)
      .then((nextInvites) => {
        if (isMounted) setInvites(nextInvites);
      })
      .catch((error) => {
        reportError(error, {
          messageKey: 'management.errors.loadInvitesFailed',
          id: 'management.errors.loadInvitesFailed',
          logMessage: 'Could not load cohort invites.',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [cohort.id]);

  useEffect(() => {
    if (!isInviteModalOpen) return undefined;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      (isQrFullscreenOpen ? qrDialogRef.current : inviteDialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      keepFocusInContainer(
        event,
        isQrFullscreenOpen ? qrDialogRef.current : inviteDialogRef.current
      );
      if (event.key === 'Escape') {
        if (isQrFullscreenOpen) {
          setIsQrFullscreenOpen(false);
          return;
        }
        closeInviteModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isInviteModalOpen, isQrFullscreenOpen]);

  const openInviteModal = async () => {
    setIsInviteModalOpen(true);
    setHasCopiedInvite(false);
    setSelectedInvite(null);

    const token = localStorage.getItem('eduquest_token');
    if (!token) {
      reportError('Missing session token.', {
        messageKey: 'management.errors.missingSession',
        id: 'management.errors.missingSession',
        includeDetail: false,
      });
      setInviteError(t('management.errors.missingSession'));
      return;
    }

    setIsInviteLoading(true);
    setInviteError(null);
    try {
      const nextInvite = await createManagementCohortInvite(token, cohort.id);
      setSelectedInvite(nextInvite);
      setInvites((current) => [
        nextInvite,
        ...current.filter((invite) => invite.id !== nextInvite.id),
      ]);
    } catch (error) {
      reportError(error, {
        messageKey: 'management.errors.createInviteFailed',
        id: 'management.errors.createInviteFailed',
        logMessage: 'Could not create cohort invite.',
      });
      setInviteError(t('management.errors.createInviteFailed'));
    } finally {
      setIsInviteLoading(false);
    }
  };

  const reopenInviteModal = (invite: ManagementCohortInvite) => {
    setSelectedInvite(invite);
    setInviteError(null);
    setHasCopiedInvite(false);
    setIsInviteModalOpen(true);
  };

  const revokeInvite = async (inviteId: string) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) {
      reportError('Missing session token.', {
        messageKey: 'management.errors.missingSession',
        id: 'management.errors.missingSession',
        includeDetail: false,
      });
      setInviteError(t('management.errors.missingSession'));
      return;
    }

    try {
      const nextInvites = await revokeManagementCohortInvite(token, cohort.id, inviteId);
      setInvites(nextInvites);
      if (selectedInvite?.id === inviteId) {
        setSelectedInvite(null);
        setIsInviteModalOpen(false);
      }
    } catch (error) {
      reportError(error, {
        messageKey: 'management.errors.revokeInviteFailed',
        id: 'management.errors.revokeInviteFailed',
        logMessage: 'Could not revoke cohort invite.',
      });
      setInviteError(t('management.errors.revokeInviteFailed'));
    }
  };

  const copyInviteLink = async () => {
    if (!selectedInvite) return;

    try {
      await navigator.clipboard.writeText(selectedInvite.url);
      setHasCopiedInvite(true);
    } catch (error) {
      reportError(error, {
        messageKey: 'management.errors.copyInviteFailed',
        id: 'management.errors.copyInviteFailed',
        logMessage: 'Could not copy cohort invite link.',
      });
      setHasCopiedInvite(false);
    }
  };

  const toggleAutomaticRegistration = async () => {
    setIsRegistrationUpdating(true);
    try {
      await onUpdate?.({ registrationOpen: !cohort.registrationOpen });
    } finally {
      setIsRegistrationUpdating(false);
    }
  };

  const qrCodeUrl = selectedInvite
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(
        selectedInvite.url
      )}`
    : undefined;
  const closeInviteModal = () => {
    setIsQrFullscreenOpen(false);
    setIsInviteModalOpen(false);
  };
  const inviteModal =
    isInviteModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={inviteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cohort-invite-title"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex bg-gaming-base p-5 outline-none md:p-10 lg:p-12"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-gaming-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-gaming-grid)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
            <div className="relative grid min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-gaming-border bg-gaming-card shadow-2xl lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
              <div className="flex min-h-0 flex-col overflow-y-auto">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gaming-border bg-gaming-base p-6 md:p-8">
                  <div className="max-w-4xl">
                    <p className="text-xs font-display font-semibold uppercase tracking-[0.35em] text-status-quest">
                      {t('management.cohorts.inviteEyebrow')}
                    </p>
                    <h2
                      id="cohort-invite-title"
                      className="mt-3 text-3xl font-display font-bold text-text-primary md:text-5xl"
                    >
                      {t('management.cohorts.inviteTitle')}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-text-secondary md:text-base">
                      {t('management.cohorts.inviteDescription')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="btn btn-ghost btn-circle shrink-0 text-text-secondary lg:hidden"
                    aria-label={t('management.cohorts.closeInvite')}
                  >
                    <X size={22} />
                  </button>
                </div>

                <div className="p-6 md:p-10">
                  <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-gaming-border bg-gaming-base p-5 md:p-6">
                    <div>
                      <p className="text-xs font-display font-semibold uppercase tracking-wider text-text-muted">
                        {t('management.cohorts.name')}
                      </p>
                      <p className="mt-1 text-xl font-display font-bold text-text-primary">
                        {cohort.name}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {cohort.schoolName} · {cohort.campusName}
                      </p>
                    </div>

                    {isInviteLoading ? (
                      <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-gaming-border text-sm text-text-muted">
                        {t('management.cohorts.inviteLoading')}
                      </div>
                    ) : inviteError ? (
                      <div role="alert" className="alert alert-warning text-sm">
                        {inviteError}
                      </div>
                    ) : selectedInvite ? (
                      <>
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-display font-semibold uppercase tracking-wider text-text-muted">
                            {t('management.cohorts.inviteLink')}
                          </span>
                          <div className="join w-full">
                            <input
                              value={selectedInvite.url}
                              readOnly
                              onFocus={(event) => event.currentTarget.select()}
                              className="input input-bordered join-item min-w-0 flex-1 border-gaming-border bg-gaming-card text-sm text-text-primary"
                            />
                            <button
                              type="button"
                              onClick={copyInviteLink}
                              className="btn btn-primary join-item"
                            >
                              <Clipboard size={18} />
                              {hasCopiedInvite
                                ? t('management.cohorts.copied')
                                : t('management.cohorts.copy')}
                            </button>
                          </div>
                        </label>

                        <div className="rounded-xl border border-gaming-border bg-gaming-card p-4 text-sm font-semibold text-text-primary">
                          {formatTimeRemaining(selectedInvite.expiresAt, t)}
                        </div>

                        <DeleteButton
                          onConfirm={() => revokeInvite(selectedInvite.id)}
                          holdDuration={1200}
                          className="w-full rounded-xl"
                        >
                          {t('management.cohorts.revokePermanently')}
                        </DeleteButton>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <aside className="relative flex min-h-[22rem] flex-col items-center justify-center gap-5 border-t border-gaming-border bg-solarized-base3 p-8 text-center text-gaming-base lg:min-h-0 lg:border-l lg:border-t-0 lg:p-10">
                <button
                  type="button"
                  onClick={closeInviteModal}
                  className="btn btn-ghost btn-circle absolute right-4 top-4 hidden text-gaming-base/70 hover:text-gaming-base lg:inline-flex"
                  aria-label={t('management.cohorts.closeInvite')}
                >
                  <X size={22} />
                </button>
                {qrCodeUrl ? (
                  <button
                    type="button"
                    onClick={() => setIsQrFullscreenOpen(true)}
                    className="mx-auto block rounded-xl transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-gaming-base"
                    aria-label={t('management.cohorts.qrFullscreen')}
                  >
                    <img
                      src={qrCodeUrl}
                      alt={t('management.cohorts.qrAlt')}
                      className="aspect-square w-full max-w-80 rounded-xl"
                    />
                  </button>
                ) : (
                  <div className="mx-auto flex aspect-square w-full max-w-80 items-center justify-center rounded-xl border border-dashed border-gaming-border text-sm text-gaming-base/70">
                    {t('management.cohorts.qrPending')}
                  </div>
                )}
                <p className="text-center text-sm font-semibold">
                  {t('management.cohorts.qrCaption')}
                </p>
              </aside>

              {isQrFullscreenOpen && qrCodeUrl && (
                <div
                  ref={qrDialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('management.cohorts.qrFullscreen')}
                  tabIndex={-1}
                  className="fixed inset-0 z-[60] flex bg-gaming-base p-5 outline-none md:p-10"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-gaming-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-gaming-grid)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />
                  <div className="relative flex min-h-0 w-full flex-1 items-center justify-center rounded-3xl border border-gaming-border bg-solarized-base3 p-8 shadow-2xl">
                    <button
                      type="button"
                      onClick={() => setIsQrFullscreenOpen(false)}
                      className="btn btn-ghost btn-circle absolute right-4 top-4 text-gaming-base/70 hover:text-gaming-base"
                      aria-label={t('management.cohorts.closeQrFullscreen')}
                    >
                      <X size={24} />
                    </button>
                    <img
                      src={qrCodeUrl}
                      alt={t('management.cohorts.qrAlt')}
                      className="aspect-square max-h-[80vh] w-full max-w-[80vh] rounded-2xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <EditableFieldContext.Provider value={{ showPencil: true }}>
      <div className="relative h-full min-h-0 overflow-y-auto p-5 pt-10">
        <div className="badge badge-outline absolute left-0 top-0 rounded-none rounded-br-xl border-0 bg-gaming-base px-3 py-2 text-xs font-semibold text-text-secondary">
          {cohort.studentCount} {t('management.cohorts.students')}
        </div>

        <div className="flex min-h-full flex-col gap-5">
          <div className="flex w-full flex-col items-center gap-2">
            <div
              className="flex h-32 w-full shrink-0 items-center justify-center rounded-2xl border border-gaming-border bg-gaming-base/50 p-2"
              title={cohort.schoolName}
            >
              {resolvedLogoUrl ? (
                <img
                  src={resolvedLogoUrl}
                  alt={cohort.schoolName}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="px-3 text-center text-sm font-display font-semibold text-text-secondary">
                  {cohort.schoolName}
                </span>
              )}
            </div>

            <div className="w-full min-w-0">
              <BadgeDropdown
                options={campusOptions}
                value={[draft.campusName]}
                onChange={(next) => {
                  const campusName = next[0] || draft.campusName;
                  setDraft((current) => ({ ...current, campusName }));
                  void onUpdate?.({ campusName });
                }}
                multiple={false}
                placeholder={t('management.cohorts.campus')}
                searchPlaceholder={t('management.cohorts.campus')}
                emptyFilterHint={t('management.cohorts.campus')}
                className="w-full"
                badgeClassName="border-gaming-border bg-gaming-card text-text-secondary"
                selectedMaxWidth="max-w-full"
                fullWidth
                showArrow
              />
            </div>
          </div>

          <div>
            <EditableText
              value={draft.name}
              onChange={(value) => {
                setDraft((current) => ({ ...current, name: value }));
                void onUpdate?.({ name: value });
              }}
              placeholder={t('management.cohorts.name')}
              className="text-2xl font-display font-bold text-text-primary"
            />
            <EditableText
              multiline
              value={draft.description}
              onChange={(value) => {
                setDraft((current) => ({ ...current, description: value }));
                void onUpdate?.({ description: value });
              }}
              placeholder={t('management.cohorts.description')}
              truncate={false}
              className="mt-2 text-sm leading-relaxed text-text-secondary"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <BadgeDropdown
              options={schoolYearOptions}
              value={[draft.startYear]}
              onChange={(next) => {
                const startYear = next[0] || draft.startYear;
                setDraft((current) => ({ ...current, startYear }));
                void onUpdate?.({ startYear: Number(startYear) || cohort.startYear });
              }}
              multiple={false}
              placeholder={t('management.cohorts.schoolYear')}
              searchPlaceholder={t('management.cohorts.schoolYear')}
              emptyFilterHint={t('management.cohorts.schoolYear')}
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[9rem]"
              showArrow
            />
            <BadgeDropdown
              options={gradeOptions}
              value={[draft.grade]}
              onChange={(next) => {
                const gradeLabel = next[0] || draft.grade;
                const grade =
                  COHORT_GRADES.find((item) => formatGrade(item) === gradeLabel) || cohort.grade;
                setDraft((current) => ({ ...current, grade: gradeLabel }));
                void onUpdate?.({ grade });
              }}
              multiple={false}
              placeholder={t('management.cohorts.grade')}
              searchPlaceholder={t('management.cohorts.grade')}
              emptyFilterHint={t('management.cohorts.grade')}
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[9rem]"
              showArrow
            />
            <BadgeDropdown
              options={levelOptions}
              value={[draft.level]}
              onChange={(next) => {
                const level = next[0] || draft.level;
                setDraft((current) => ({ ...current, level }));
                void onUpdate?.({ level: Number(level) || cohort.level });
              }}
              multiple={false}
              placeholder={t('management.cohorts.level')}
              searchPlaceholder={t('management.cohorts.level')}
              emptyFilterHint={t('management.cohorts.level')}
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[6rem]"
              showArrow
            />
          </div>

          <div className="mt-auto flex flex-wrap gap-2">
            <BadgeDropdown
              options={majorOptions}
              value={draft.majorSpeciality ? [draft.majorSpeciality] : []}
              onChange={(next) => {
                const majorSpeciality = next[0] || '';
                setDraft((current) => ({ ...current, majorSpeciality }));
                void onUpdate?.({ majorSpeciality });
              }}
              multiple={false}
              placeholder={t('management.cohorts.major')}
              searchPlaceholder={t('management.cohorts.major')}
              emptyFilterHint={t('management.cohorts.major')}
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[10rem]"
              showArrow
            />
            <BadgeDropdown
              options={minorOptions}
              value={draft.minorSpeciality ? [draft.minorSpeciality] : []}
              onChange={(next) => {
                const minorSpeciality = next[0] || '';
                setDraft((current) => ({ ...current, minorSpeciality }));
                void onUpdate?.({ minorSpeciality });
              }}
              multiple={false}
              placeholder={t('management.cohorts.minor')}
              searchPlaceholder={t('management.cohorts.minor')}
              emptyFilterHint={t('management.cohorts.minor')}
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[10rem]"
              showArrow
            />
          </div>

          <div className="rounded-2xl border border-gaming-border bg-gaming-base/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-display font-semibold uppercase tracking-wider text-text-muted">
                {t('management.cohorts.validInvites')}
              </p>
              <div className="flex items-center gap-2">
                <span className="badge badge-sm border-gaming-border bg-gaming-card text-text-secondary">
                  {invites.length}
                </span>
                <AddButton
                  onClick={openInviteModal}
                  iconSize={14}
                  shape="round"
                  className="h-7 w-7"
                  aria-label={t('management.cohorts.newInvite')}
                  title={t('management.cohorts.newInvite')}
                />
              </div>
            </div>

            {invites.length > 0 ? (
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-xl border border-gaming-border bg-gaming-card p-2"
                  >
                    <button
                      type="button"
                      onClick={() => reopenInviteModal(invite)}
                      className="flex w-full items-center justify-between gap-2 text-left text-xs text-text-secondary transition hover:text-text-primary"
                    >
                      <span className="min-w-0 truncate">{invite.url}</span>
                      <ExternalLink size={14} className="shrink-0" />
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-status-quest">
                        {formatTimeRemaining(invite.expiresAt, t)}
                      </span>
                      <DeleteButton
                        onConfirm={() => revokeInvite(invite.id)}
                        holdDuration={1000}
                        iconSize={12}
                        className="btn-xs rounded-lg text-[11px]"
                      >
                        {t('management.cohorts.revoke')}
                      </DeleteButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">{t('management.cohorts.noValidInvites')}</p>
            )}
          </div>

          <div
            className={[
              'rounded-2xl border p-4',
              cohort.registrationOpen
                ? 'border-status-completed/50 bg-status-completed/10'
                : 'border-gaming-border bg-gaming-base/50',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <div
                className={[
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  cohort.registrationOpen
                    ? 'bg-status-completed text-gaming-base'
                    : 'bg-gaming-card text-text-secondary',
                ].join(' ')}
              >
                {cohort.registrationOpen ? (
                  <UnlockKeyhole size={18} aria-hidden />
                ) : (
                  <LockKeyhole size={18} aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-display font-bold uppercase tracking-[0.12em] text-text-primary">
                  {cohort.registrationOpen
                    ? t('management.cohorts.registrationOpen')
                    : t('management.cohorts.registrationClosed')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {cohort.registrationOpen
                    ? t('management.cohorts.registrationOpenDescription')
                    : t('management.cohorts.registrationClosedDescription')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleAutomaticRegistration}
              disabled={isRegistrationUpdating}
              className={[
                'btn mt-4 w-full rounded-xl font-display font-black uppercase tracking-[0.14em]',
                cohort.registrationOpen
                  ? 'border-gaming-border bg-gaming-card text-text-secondary hover:text-text-primary'
                  : 'border-status-quest/50 bg-status-quest text-gaming-base hover:bg-status-quest/90',
              ].join(' ')}
            >
              {isRegistrationUpdating
                ? t('management.cohorts.registrationUpdating')
                : cohort.registrationOpen
                  ? t('management.cohorts.closeRegistration')
                  : t('management.cohorts.openRegistration')}
            </button>
          </div>
        </div>
      </div>

      {inviteModal}
    </EditableFieldContext.Provider>
  );
}

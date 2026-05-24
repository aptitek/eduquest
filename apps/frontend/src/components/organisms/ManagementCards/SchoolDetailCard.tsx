import { useEffect, useState } from 'react';
import { EditableFieldContext, EditableText } from '../../atoms/EditableText';
import type { SchoolRow } from '../../../features/management/types';
import { formatAddress, formatDate } from '../../../features/management/utils';
import aptitekLogoUrl from '../../../assets/logo.svg';
import { DetailItem } from './DetailItem';

export function SchoolDetailCard({ school, t }: { school: SchoolRow; t: (key: string) => string }) {
  const [draft, setDraft] = useState({
    name: school.name,
    website: school.website || '',
    emailDomain: school.emailDomain || '',
    address: formatAddress(school.address),
  });
  const resolvedLogoUrl =
    school.logoUrl || (school.name === 'Aptitek' ? aptitekLogoUrl : undefined);

  useEffect(() => {
    setDraft({
      name: school.name,
      website: school.website || '',
      emailDomain: school.emailDomain || '',
      address: formatAddress(school.address),
    });
  }, [school]);

  return (
    <EditableFieldContext.Provider value={{ showPencil: true }}>
      <div className="relative h-full min-h-[18rem] p-5 pt-10">
        <div className="badge badge-outline absolute left-0 top-0 rounded-none rounded-br-xl border-0 bg-gaming-base px-3 py-2 text-xs font-semibold text-text-secondary">
          {school.cohortCount} {t('management.schools.cohorts')} · {school.studentCount}{' '}
          {t('management.schools.students')}
        </div>

        <div className="flex h-full flex-col gap-5">
          <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-2xl border border-gaming-border bg-gaming-base/50 p-5">
            {resolvedLogoUrl ? (
              <img
                src={resolvedLogoUrl}
                alt={school.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-center text-lg font-display font-semibold text-text-secondary">
                {school.name}
              </span>
            )}
          </div>

          <div>
            <EditableText
              value={draft.name}
              onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
              placeholder={t('management.schools.name')}
              className="text-2xl font-display font-bold text-text-primary"
            />
          </div>

          <div className="grid gap-3">
            <EditableText
              value={draft.website}
              onChange={(value) => setDraft((current) => ({ ...current, website: value }))}
              placeholder={t('management.schools.website')}
              className="text-sm text-solarized-blue"
            />
            <EditableText
              value={draft.address}
              onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
              placeholder={t('management.schools.address')}
              className="text-sm text-text-secondary"
            />
            <EditableText
              value={draft.emailDomain}
              onChange={(value) => setDraft((current) => ({ ...current, emailDomain: value }))}
              placeholder={t('management.schools.emailDomain')}
              className="text-sm text-text-secondary"
            />
          </div>

          <div className="mt-auto">
            <DetailItem
              label={t('management.schools.createdAt')}
              value={formatDate(school.createdAt)}
            />
          </div>
        </div>
      </div>
    </EditableFieldContext.Provider>
  );
}

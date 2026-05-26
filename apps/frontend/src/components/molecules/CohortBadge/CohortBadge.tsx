import { CompoundBadge } from '../../atoms/CompoundBadge';
import { SchoolLogoBadge } from '../SchoolLogoBadge';
import type { CohortRow } from '../../../features/management/types';
import { formatSchoolYear, getCohortBadgeParts } from '../../../features/management/utils';
import { getSeededBackgroundClass } from '../../../utils/colorHash';
import { cn } from '../../../utils/cn';

function CohortYearBadge({ startYear }: { startYear: number }) {
  const label = formatSchoolYear(startYear);

  return (
    <span
      className={cn(
        'badge badge-sm border-transparent font-semibold text-white shadow-sm',
        getSeededBackgroundClass(label)
      )}
      title={String(startYear)}
    >
      {label}
    </span>
  );
}

export function CohortDropdownBadge({ cohort }: { cohort: CohortRow }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <SchoolLogoBadge name={cohort.schoolName} logoUrl={cohort.school?.logoUrl} />
      <CohortYearBadge startYear={cohort.startYear} />
      <CompoundBadge parts={getCohortBadgeParts(cohort)} />
    </span>
  );
}

export function CohortListBadge({
  cohort,
  showSchoolYear = true,
}: {
  cohort: CohortRow;
  showSchoolYear?: boolean;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      {showSchoolYear ? (
        <CohortYearBadge startYear={cohort.startYear} />
      ) : null}
      <CompoundBadge parts={getCohortBadgeParts(cohort)} />
    </span>
  );
}

import { CompoundBadge } from '../../atoms/CompoundBadge';
import { SchoolLogoBadge } from '../SchoolLogoBadge';
import type { CohortRow } from '../../../features/management/types';
import { formatSchoolYear, getCohortBadgeParts } from '../../../features/management/utils';
import { getSeededBackgroundColor } from '../../../utils/colorHash';

function CohortYearBadge({ schoolYear }: { schoolYear: string }) {
  const label = formatSchoolYear(schoolYear);

  return (
    <span
      className="badge badge-sm border-transparent font-semibold text-white shadow-sm"
      title={schoolYear}
      style={{ backgroundColor: getSeededBackgroundColor(label) }}
    >
      {label}
    </span>
  );
}

export function CohortDropdownBadge({ cohort }: { cohort: CohortRow }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <SchoolLogoBadge name={cohort.schoolName} logoUrl={cohort.school?.logoUrl} />
      <CohortYearBadge schoolYear={cohort.schoolYear} />
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
        <CohortYearBadge schoolYear={cohort.schoolYear} />
      ) : null}
      <CompoundBadge parts={getCohortBadgeParts(cohort)} />
    </span>
  );
}

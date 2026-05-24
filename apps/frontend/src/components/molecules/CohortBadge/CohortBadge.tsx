import { CompoundBadge } from '../../atoms/CompoundBadge';
import { SchoolLogoBadge } from '../SchoolLogoBadge';
import type { CohortRow } from '../../../features/management/types';
import { formatSchoolYear, getCohortBadgeParts } from '../../../features/management/utils';

export function CohortDropdownBadge({ cohort }: { cohort: CohortRow }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <SchoolLogoBadge name={cohort.schoolName} logoUrl={cohort.school?.logoUrl} />
      <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary">
        {formatSchoolYear(cohort.schoolYear)}
      </span>
      <CompoundBadge parts={getCohortBadgeParts(cohort)} />
    </span>
  );
}

export function CohortListBadge({ cohort }: { cohort: CohortRow }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary">
        {formatSchoolYear(cohort.schoolYear)}
      </span>
      <CompoundBadge parts={getCohortBadgeParts(cohort)} />
    </span>
  );
}

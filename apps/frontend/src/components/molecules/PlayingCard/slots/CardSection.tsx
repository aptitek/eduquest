import { cn } from '../../../../utils/cn';
import type { CardMetadataItem, CardSection as CardSectionModel } from '../types';
import { EditableTextSlot } from './EditableTextSlot';

export interface CardSectionProps {
  section: CardSectionModel;
  className?: string;
}

export function CardSection({ section, className }: CardSectionProps) {
  return (
    <section className={cn('rounded-xl border border-gaming-border bg-gaming-base/30 p-3', className)}>
      {section.title ? (
        <EditableTextSlot slot={{ ...section.title, variant: section.title.variant || 'label' }} />
      ) : null}
      {section.description ? (
        <div className="mt-1">
          <EditableTextSlot slot={{ ...section.description, variant: section.description.variant || 'description' }} />
        </div>
      ) : null}
      {section.items?.length ? <CardMetadataList items={section.items} className="mt-2" /> : null}
      {section.content ? <div className="mt-2 text-sm text-text-secondary">{section.content}</div> : null}
      {section.actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{section.actions}</div> : null}
    </section>
  );
}

export function CardMetadataList({
  items,
  className,
}: {
  items: CardMetadataItem[];
  className?: string;
}) {
  return (
    <dl className={cn('grid gap-2', className)}>
      {items.map((item) => (
        <div key={item.id} className="min-w-0">
          <dt className="text-[0.65rem] font-display uppercase tracking-widest text-text-muted">
            {item.label}
          </dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-text-primary">
            {item.value || '-'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default CardSection;

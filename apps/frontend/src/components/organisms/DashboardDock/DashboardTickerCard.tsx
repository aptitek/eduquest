import { Bell, Coins } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface DashboardTickerCardProps {
  title: string;
  subtitle: string;
  side: 'left' | 'right';
  className?: string;
}

export function DashboardTickerCard({
  title,
  subtitle,
  side,
  className,
}: DashboardTickerCardProps) {
  const Icon = side === 'left' ? Bell : Coins;

  return (
    <section
      aria-label={title}
      className={cn(
        'mb-8 flex h-32 w-36 shrink-0 flex-col justify-between rounded-[1.4rem] border border-gaming-border bg-gaming-card/95 p-4 shadow-2xl',
        className
      )}
    >
      <div className="flex items-center justify-between text-solarized-yellow">
        <Icon size={20} aria-hidden />
        <span className="h-2 w-2 rounded-full bg-solarized-yellow shadow-[0_0_16px_rgba(181,137,0,0.75)]" />
      </div>
      <div>
        <h2 className="font-display text-sm font-bold text-text-primary">{title}</h2>
        <p className="mt-1 text-xs font-medium text-text-muted">{subtitle}</p>
      </div>
    </section>
  );
}

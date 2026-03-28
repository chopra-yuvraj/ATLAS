// src/components/queue/SeverityBadge.tsx
import { cn, SEVERITY_COLORS } from '@/lib/utils';
import type { SeverityTier } from '@/types/database';

const LABELS: Record<SeverityTier, string> = {
    critical: 'Critical',
    urgent: 'Urgent',
    moderate: 'Moderate',
    minor: 'Minor',
    nonurgent: 'Non-urgent',
};

interface SeverityBadgeProps {
    tier: SeverityTier;
    className?: string;
}

export function SeverityBadge({ tier, className }: SeverityBadgeProps) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
            SEVERITY_COLORS[tier].badge,
            className
        )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_COLORS[tier].dot)} />
            {LABELS[tier]}
        </span>
    );
}

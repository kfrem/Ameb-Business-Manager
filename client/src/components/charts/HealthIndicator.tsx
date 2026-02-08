import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

type HealthStatus = 'good' | 'warning' | 'danger';

interface HealthIndicatorProps {
  icon: LucideIcon;
  label: string;
  message: string;
  status: HealthStatus;
  href?: string;
}

const statusStyles: Record<HealthStatus, { bg: string; iconBg: string; iconColor: string; border: string }> = {
  good: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    iconColor: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
};

function IndicatorContent({ icon: Icon, label, message, status }: HealthIndicatorProps) {
  const styles = statusStyles[status];

  return (
    <Card className={cn(
      "transition-colors hover:shadow-sm cursor-pointer",
      styles.bg, styles.border
    )}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", styles.iconBg)}>
          <Icon className={cn("w-5 h-5", styles.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn("text-sm font-medium", styles.iconColor)}>{message}</p>
        </div>
        {/* Traffic light dot */}
        <div className={cn(
          "w-3 h-3 rounded-full shrink-0",
          status === 'good' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
        )} />
      </CardContent>
    </Card>
  );
}

export function HealthIndicator(props: HealthIndicatorProps) {
  if (props.href) {
    return (
      <Link href={props.href}>
        <IndicatorContent {...props} />
      </Link>
    );
  }
  return <IndicatorContent {...props} />;
}

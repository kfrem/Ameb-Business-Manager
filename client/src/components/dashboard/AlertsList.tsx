import { AlertTriangle, AlertCircle, Info, X, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Alert } from '@shared/schema';

interface AlertsListProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
  limit?: number;
}

const severityConfig = {
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
};

export function AlertsList({ alerts, onDismiss, limit }: AlertsListProps) {
  const displayAlerts = limit ? alerts.slice(0, limit) : alerts;

  if (displayAlerts.length === 0) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No alerts</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {displayAlerts.map(alert => {
        const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
        const Icon = config.icon;
        
        return (
          <Card
            key={alert.id}
            className={cn("p-3 flex items-start gap-3", config.bg)}
            data-testid={`alert-${alert.id}`}
          >
            <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.color)} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{alert.title}</p>
              {alert.message && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {alert.message}
                </p>
              )}
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => onDismiss(alert.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </Card>
        );
      })}
      
      {limit && alerts.length > limit && (
        <Button variant="ghost" className="w-full" asChild>
          <a href="/alerts">
            View all {alerts.length} alerts
            <ChevronRight className="w-4 h-4 ml-1" />
          </a>
        </Button>
      )}
    </div>
  );
}

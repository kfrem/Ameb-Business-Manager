import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Bell, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Alerts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['/api/alerts'],
  });

  const dismissAlert = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/alerts/${id}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
    },
  });

  const dismissAll = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/alerts/dismiss-all', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({ title: 'All alerts dismissed' });
    },
  });

  const unreadAlerts = (alerts || []).filter((a: any) => !a.isRead);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Alerts</h1>
          {unreadAlerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => dismissAll.mutate()}
              disabled={dismissAll.isPending}
              data-testid="button-dismiss-all"
            >
              <Check className="w-4 h-4 mr-1" />
              Dismiss All
            </Button>
          )}
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <AlertsList
            alerts={alerts || []}
            onDismiss={(id) => dismissAlert.mutate(id)}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}

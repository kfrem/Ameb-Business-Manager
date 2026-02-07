import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Clock, ChevronRight, Briefcase, Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BusinessTile } from '@/components/dashboard/BusinessTile';
import { MoneyOverview } from '@/components/dashboard/MoneyOverview';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { ApprovalsList } from '@/components/dashboard/ApprovalsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'wouter';

export default function Dashboard() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const { data: dashboardData, isLoading } = useQuery<any>({
    queryKey: ['/api/dashboard'],
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: ['/api/alerts'],
  });

  const { data: approvals } = useQuery<any[]>({
    queryKey: ['/api/approvals'],
    enabled: isOwner,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const {
    businesses = [],
    bankAccounts = [],
    todayIn = 0,
    todayOut = 0,
    totalBalance = 0,
  } = dashboardData || {};

  const unreadAlerts = (alerts || []).filter((a: any) => !a.isRead);
  const pendingApprovals = (approvals || []).filter((a: any) => a.status === 'pending');

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="AMT" />

      <main className="p-4 space-y-6 max-w-2xl mx-auto">
        {isOwner && pendingApprovals.length > 0 && (
          <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {pendingApprovals.length}
              </Badge>
            </CardHeader>
            <CardContent>
              <ApprovalsList approvals={pendingApprovals} limit={2} />
            </CardContent>
          </Card>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Money Overview</h2>
          </div>
          <MoneyOverview
            totalBalance={totalBalance}
            todayIn={todayIn}
            todayOut={todayOut}
            banks={bankAccounts}
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Businesses</h2>
            <Badge variant="outline">{businesses.length}</Badge>
          </div>
          {businesses.length === 0 ? (
            <Card className="text-center py-12" data-testid="empty-state">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Welcome to AMT!</h3>
                  <p className="text-muted-foreground mt-1">
                    You don't have any businesses yet.<br />
                    Contact the administrator to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {businesses.map((business: any) => (
                <BusinessTile
                  key={business.id}
                  id={business.id}
                  name={business.name}
                  type={business.type}
                  cashIn={business.cashIn}
                  cashOut={business.cashOut}
                  profit={business.profit}
                  alertCount={business.alertCount}
                />
              ))}
            </div>
          )}
        </section>

        {unreadAlerts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Alerts
              </h2>
              <Link href="/alerts">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <AlertsList alerts={unreadAlerts} limit={3} />
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

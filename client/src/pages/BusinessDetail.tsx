import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, TrendingDown, Package, Truck, Gem, Wrench, Fuel, ChevronRight, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNav } from '@/components/layout/BottomNav';
import { DonutChart } from '@/components/charts/DonutChart';
import { BarChartComponent } from '@/components/charts/BarChart';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { formatCurrency, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';

const iconMap: Record<string, any> = {
  machinery: Truck,
  gold_agent: Gem,
  gold_owner: Gem,
  spare_parts: Wrench,
  fuel: Fuel,
};

export default function BusinessDetail() {
  const [, params] = useRoute('/business/:id');
  const [, setLocation] = useLocation();
  const businessId = params?.id;

  const { data: business, isLoading } = useQuery<any>({
    queryKey: ['/api/businesses', businessId],
    enabled: !!businessId,
  });

  const { data: kpis } = useQuery<any>({
    queryKey: ['/api/businesses', businessId, 'kpis'],
    enabled: !!businessId,
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: ['/api/alerts'],
  });

  // Fetch recent transactions for this business
  const { data: transactions } = useQuery<any[]>({
    queryKey: ['/api/transactions', { business: businessId }],
    queryFn: async () => {
      const savedUser = localStorage.getItem('amt_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;
      const headers: Record<string, string> = {};
      if (userId) headers['X-User-Id'] = userId;
      const res = await fetch(`/api/transactions?business=${businessId}`, { headers });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!businessId,
  });

  if (isLoading || !business) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 h-14 px-4">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-32 h-6" />
          </div>
        </header>
        <main className="p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const Icon = iconMap[business.type] || Package;
  const businessAlerts = (alerts || []).filter((a: any) => a.businessId === businessId && !a.isRead);

  const {
    totalRevenue = 0,
    totalExpenses = 0,
    profit = 0,
    cashIn = 0,
    cashOut = 0,
    costBreakdown = [],
    revenueBreakdown = [],
    statusCounts = {},
    receivables = 0,
  } = kpis || {};

  const recentTxns = (transactions || []).slice(0, 10);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            className="text-primary-foreground hover:bg-primary/80"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Icon className="w-6 h-6" />
          <h1 className="text-lg font-semibold truncate">{business.name}</h1>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* KPI Cards — all clickable, drilling down to filtered transactions */}
        <div className="grid grid-cols-3 gap-3">
          <Link href={`/transactions?business=${businessId}&filter=in`}>
            <Card className="p-3 text-center hover:bg-muted/50 cursor-pointer transition-colors">
              <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="font-bold text-base text-green-600 dark:text-green-400">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-[10px] text-green-600 mt-0.5">Tap to view</p>
            </Card>
          </Link>
          <Link href={`/transactions?business=${businessId}&filter=out`}>
            <Card className="p-3 text-center hover:bg-muted/50 cursor-pointer transition-colors">
              <TrendingDown className="w-5 h-5 mx-auto text-red-500 mb-1" />
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="font-bold text-base text-red-600 dark:text-red-400">
                {formatCurrency(totalExpenses)}
              </p>
              <p className="text-[10px] text-red-600 mt-0.5">Tap to view</p>
            </Card>
          </Link>
          <Link href={`/transactions?business=${businessId}`}>
            <Card className="p-3 text-center hover:bg-muted/50 cursor-pointer transition-colors">
              <Package className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className={cn(
                "font-bold text-base",
                profit >= 0 ? "text-primary" : "text-red-600"
              )}>
                {formatCurrency(profit)}
              </p>
              <p className="text-[10px] text-primary mt-0.5">Tap to view</p>
            </Card>
          </Link>
        </div>

        {receivables > 0 && (
          <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receivables Due</p>
                <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">
                  {formatCurrency(receivables)}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">
              Transactions
              {recentTxns.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {transactions?.length || 0}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts
              {businessAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {businessAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {costBreakdown.length > 0 && (
              <DonutChart title="Cost Breakdown" data={costBreakdown} />
            )}

            {revenueBreakdown.length > 0 && (
              <BarChartComponent title="Revenue Sources" data={revenueBreakdown} horizontal />
            )}

            {Object.keys(statusCounts).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Status Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                        <Badge variant="secondary">{count as number}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 mt-4">
            {recentTxns.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">No transactions yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-2">
                  {recentTxns.map((tx: any) => (
                    <Link key={tx.id} href={`/transaction/${tx.id}`}>
                      <Card className="hover-elevate cursor-pointer transition-colors hover:bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                              tx.direction === 'in'
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-red-100 dark:bg-red-900/30"
                            )}>
                              {tx.direction === 'in' ? (
                                <ArrowDownLeft className="w-4 h-4 text-green-600" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {tx.counterparty || tx.notes || 'Transaction'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(tx.date)}
                              </p>
                            </div>
                            <p className={cn(
                              "font-semibold text-sm",
                              tx.direction === 'in' ? "text-green-600" : "text-red-600"
                            )}>
                              {tx.direction === 'in' ? '+' : '-'}
                              {formatCurrency(parseFloat(tx.amount), tx.currency)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {(transactions?.length || 0) > 10 && (
                  <Link href={`/transactions?business=${businessId}`}>
                    <Button variant="outline" className="w-full">
                      View All {transactions?.length} Transactions
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <AlertsList alerts={businessAlerts} />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}

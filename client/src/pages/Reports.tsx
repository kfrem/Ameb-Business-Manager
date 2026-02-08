import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Heart, TrendingUp, TrendingDown, Minus,
  DollarSign, Wallet, AlertTriangle, Package, Bell,
  ArrowUpRight, ArrowDownRight, Clock, ChevronRight,
  Banknote, Building2, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { HealthGauge } from '@/components/charts/HealthGauge';
import { TrendChart } from '@/components/charts/TrendChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { BarChartComponent } from '@/components/charts/BarChart';
import { HealthIndicator } from '@/components/charts/HealthIndicator';
import { formatCurrency, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Reports() {
  const [, setLocation] = useLocation();
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

  const { data: health, isLoading } = useQuery<any>({
    queryKey: ['/api/reports/health'],
    queryFn: async () => {
      const savedUser = localStorage.getItem('amt_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;
      const headers: Record<string, string> = {};
      if (userId) headers['X-User-Id'] = userId;
      const res = await fetch('/api/reports/health', { headers });
      if (!res.ok) throw new Error('Failed to fetch health data');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Heart className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">Business Health</h1>
          </div>
        </header>
        <main className="p-4 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const {
    healthScore = 0,
    monthlyTrend = [],
    currentMonth = { revenue: 0, expenses: 0, profit: 0 },
    lastMonth = { revenue: 0, expenses: 0, profit: 0 },
    categoryBreakdown = [],
    businessComparison = [],
    cashPosition = { total: 0, accounts: [] },
    alerts = {},
    recentTransactions = [],
  } = health || {};

  // Calculate trend arrows
  const revenueTrend = currentMonth.revenue > lastMonth.revenue ? 'up' : currentMonth.revenue < lastMonth.revenue ? 'down' : 'flat';
  const expenseTrend = currentMonth.expenses > lastMonth.expenses ? 'up' : currentMonth.expenses < lastMonth.expenses ? 'down' : 'flat';
  const profitTrend = currentMonth.profit > lastMonth.profit ? 'up' : currentMonth.profit < lastMonth.profit ? 'down' : 'flat';

  // Format business comparison for horizontal bar chart
  const bizChartData = (businessComparison || []).map((b: any) => ({
    name: b.name.length > 12 ? b.name.substring(0, 12) + '...' : b.name,
    value: b.profit,
    id: b.id,
    color: b.profit >= 0 ? 'hsl(142, 76%, 42%)' : 'hsl(0, 72%, 51%)',
  }));

  // Cash position for donut
  const cashChartData = (cashPosition.accounts || []).map((a: any, i: number) => ({
    name: a.name,
    value: Math.max(a.balance, 0),
  }));

  function TrendIcon({ trend, good }: { trend: string; good: 'up' | 'down' }) {
    if (trend === 'up') {
      return <ArrowUpRight className={cn("w-4 h-4", good === 'up' ? "text-green-500" : "text-red-500")} />;
    }
    if (trend === 'down') {
      return <ArrowDownRight className={cn("w-4 h-4", good === 'down' ? "text-green-500" : "text-red-500")} />;
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Heart className="w-5 h-5 text-red-500" />
          <h1 className="text-lg font-semibold">Business Health</h1>
          <Badge variant="outline" className="ml-auto text-[10px]">
            Live
          </Badge>
        </div>
      </header>

      <main className="p-4 space-y-5 max-w-2xl mx-auto">

        {/* ====== SECTION 1: Health Score Gauge ====== */}
        <HealthGauge
          score={healthScore}
          label="Your Business Health"
          onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
        />

        {/* Score Breakdown (toggled on tap) */}
        {showScoreBreakdown && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                What affects your score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ScoreItem
                label="Profit margin"
                value={currentMonth.profit > 0 && currentMonth.revenue > 0
                  ? `${Math.round((currentMonth.profit / currentMonth.revenue) * 100)}%`
                  : '0%'}
                good={currentMonth.profit > 0}
                maxPoints={30}
                points={
                  currentMonth.revenue > 0 && (currentMonth.profit / currentMonth.revenue) > 0.1 ? 30
                  : currentMonth.profit > 0 ? 15 : 0
                }
              />
              <ScoreItem
                label="Cash flow today"
                value={alerts.cashFlowPositive ? 'Positive' : 'Negative'}
                good={alerts.cashFlowPositive}
                maxPoints={20}
                points={alerts.cashFlowPositive ? 20 : 0}
              />
              <ScoreItem
                label="Outstanding debts"
                value={alerts.receivablesAmount > 0 ? formatCurrency(alerts.receivablesAmount) : 'None'}
                good={!alerts.receivablesAmount || alerts.receivablesAmount === 0}
                maxPoints={20}
                points={!alerts.receivablesAmount || alerts.receivablesAmount === 0 ? 20 : 0}
              />
              <ScoreItem
                label="Stock levels"
                value={alerts.lowStockCount > 0 ? `${alerts.lowStockCount} low` : 'Healthy'}
                good={!alerts.lowStockCount || alerts.lowStockCount === 0}
                maxPoints={15}
                points={!alerts.lowStockCount || alerts.lowStockCount === 0 ? 15 : 0}
              />
              <ScoreItem
                label="Alerts"
                value={alerts.unreadAlertCount > 0 ? `${alerts.unreadAlertCount} unread` : 'All clear'}
                good={!alerts.unreadAlertCount || alerts.unreadAlertCount === 0}
                maxPoints={15}
                points={!alerts.unreadAlertCount || alerts.unreadAlertCount === 0 ? 15 : 0}
              />
            </CardContent>
          </Card>
        )}

        {/* ====== SECTION 2: Money Flow Trend ====== */}
        {monthlyTrend.length > 0 && (
          <TrendChart
            title="Money Flow"
            data={monthlyTrend}
          />
        )}

        {/* Revenue / Expenses / Profit Cards with trends — clickable */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/transactions?filter=in">
            <Card className="p-2.5 text-center hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendIcon trend={revenueTrend} good="up" />
                <span className="text-[10px] text-muted-foreground">Money In</span>
              </div>
              <p className="font-bold text-sm text-green-600 dark:text-green-400">
                {formatCurrency(currentMonth.revenue)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Last: {formatCurrency(lastMonth.revenue)}
              </p>
            </Card>
          </Link>
          <Link href="/transactions?filter=out">
            <Card className="p-2.5 text-center hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendIcon trend={expenseTrend} good="down" />
                <span className="text-[10px] text-muted-foreground">Money Out</span>
              </div>
              <p className="font-bold text-sm text-red-600 dark:text-red-400">
                {formatCurrency(currentMonth.expenses)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Last: {formatCurrency(lastMonth.expenses)}
              </p>
            </Card>
          </Link>
          <Link href="/transactions">
            <Card className="p-2.5 text-center hover:bg-muted/50 cursor-pointer transition-colors">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendIcon trend={profitTrend} good="up" />
                <span className="text-[10px] text-muted-foreground">Profit</span>
              </div>
              <p className={cn(
                "font-bold text-sm",
                currentMonth.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatCurrency(currentMonth.profit)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Last: {formatCurrency(lastMonth.profit)}
              </p>
            </Card>
          </Link>
        </div>

        {/* ====== SECTION 3: Where Money Goes ====== */}
        {categoryBreakdown.length > 0 && (
          <DonutChart title="Where Money Goes" data={categoryBreakdown} />
        )}

        {/* ====== SECTION 4: Business Comparison ====== */}
        {bizChartData.length > 1 && (
          <div>
            <BarChartComponent
              title="Profit by Business"
              data={bizChartData}
              horizontal
              height={Math.max(120, bizChartData.length * 45)}
            />
            <div className="mt-2 space-y-1">
              {(businessComparison || []).map((b: any) => (
                <Link key={b.id} href={`/business/${b.id}`}>
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-semibold",
                        b.profit >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {b.profit >= 0 ? '+' : ''}{formatCurrency(b.profit)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ====== SECTION 5: Cash Position ====== */}
        {cashPosition.accounts && cashPosition.accounts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Cash Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-3">
                <p className="text-xs text-muted-foreground">
                  You have across {cashPosition.accounts.length} account{cashPosition.accounts.length > 1 ? 's' : ''}
                </p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {formatCurrency(cashPosition.total)}
                </p>
              </div>

              {cashChartData.length > 1 && (
                <DonutChart data={cashChartData} height={160} showLegend={true} />
              )}

              <div className="mt-3 space-y-1.5">
                {cashPosition.accounts.map((acc: any) => (
                  <Link key={acc.id} href={`/bank/${acc.id}`}>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-border/50">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{acc.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatCurrency(acc.balance, acc.currency)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Link href="/banks">
                <p className="text-center text-xs text-primary mt-3 cursor-pointer hover:underline">
                  View all bank accounts →
                </p>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* ====== SECTION 6: Health Indicators (Traffic Lights) ====== */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Quick Health Check
          </h2>
          <div className="space-y-2">
            <HealthIndicator
              icon={DollarSign}
              label="Cash Flow"
              message={alerts.cashFlowPositive
                ? 'Money coming in more than going out'
                : 'Spending more than earning today'}
              status={alerts.cashFlowPositive ? 'good' : 'danger'}
              href="/transactions?period=today"
            />
            <HealthIndicator
              icon={Wallet}
              label="Money Owed to You"
              message={alerts.receivablesAmount > 0
                ? `${formatCurrency(alerts.receivablesAmount)} outstanding`
                : 'No outstanding debts'}
              status={alerts.receivablesAmount > 0 ? 'warning' : 'good'}
              href="/customers"
            />
            <HealthIndicator
              icon={Package}
              label="Stock Levels"
              message={alerts.lowStockCount > 0
                ? `${alerts.lowStockCount} item${alerts.lowStockCount > 1 ? 's' : ''} running low`
                : 'All stock levels healthy'}
              status={alerts.lowStockCount > 0 ? 'warning' : 'good'}
              href="/stock"
            />
            {alerts.oldAssetCount > 0 && (
              <HealthIndicator
                icon={Clock}
                label="Old Assets"
                message={`${alerts.oldAssetCount} asset${alerts.oldAssetCount > 1 ? 's' : ''} older than 1 year`}
                status="warning"
                href="/stock"
              />
            )}
            <HealthIndicator
              icon={Bell}
              label="Alerts"
              message={alerts.unreadAlertCount > 0
                ? `${alerts.unreadAlertCount} alert${alerts.unreadAlertCount > 1 ? 's' : ''} need attention`
                : 'All clear, no alerts'}
              status={alerts.unreadAlertCount > 0 ? 'danger' : 'good'}
              href="/alerts"
            />
          </div>
        </div>

        {/* ====== SECTION 7: Recent Activity ====== */}
        {recentTransactions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentTransactions.map((tx: any) => (
                <Link key={tx.id} href={`/transaction/${tx.id}`}>
                  <div className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      tx.direction === 'in'
                        ? "bg-green-100 dark:bg-green-900/30"
                        : "bg-red-100 dark:bg-red-900/30"
                    )}>
                      {tx.direction === 'in' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.counterparty || tx.categoryName || (tx.direction === 'in' ? 'Income' : 'Expense')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {tx.businessName} • {formatDate(tx.date || tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-semibold",
                        tx.direction === 'in' ? "text-green-600" : "text-red-600"
                      )}>
                        {tx.direction === 'in' ? '+' : '-'}{formatCurrency(parseFloat(tx.amount))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              <Link href="/transactions">
                <p className="text-center text-xs text-primary mt-2 cursor-pointer hover:underline">
                  View all transactions →
                </p>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Empty state when no data at all */}
        {!isLoading && healthScore === 0 && monthlyTrend.length === 0 && recentTransactions.length === 0 && (
          <Card className="p-8 text-center">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">
              No business data yet. Start by adding a business and recording transactions.
            </p>
            <Button onClick={() => setLocation('/new-entry')}>
              Record First Transaction
            </Button>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/** Score breakdown item */
function ScoreItem({ label, value, good, maxPoints, points }: {
  label: string;
  value: string;
  good: boolean;
  maxPoints: number;
  points: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full",
          good ? "bg-green-500" : "bg-red-500"
        )} />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs font-medium",
          good ? "text-green-600" : "text-red-600"
        )}>
          {value}
        </span>
        <Badge variant="outline" className="text-[10px] h-5">
          {points}/{maxPoints}
        </Badge>
      </div>
    </div>
  );
}

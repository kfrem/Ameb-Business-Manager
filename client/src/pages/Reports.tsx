import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Download, FileText, Calendar } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { DonutChart } from '@/components/charts/DonutChart';
import { BarChartComponent } from '@/components/charts/BarChart';
import { formatCurrency } from '@/lib/constants';
import { format, subMonths } from 'date-fns';

export default function Reports() {
  const [, setLocation] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedBusiness, setSelectedBusiness] = useState('all');

  const { data: businesses } = useQuery({
    queryKey: ['/api/businesses'],
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/reports', { month: selectedMonth, business: selectedBusiness }],
    queryFn: async () => {
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedBusiness !== 'all') params.set('business', selectedBusiness);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
  });

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  const {
    totalRevenue = 0,
    totalExpenses = 0,
    profit = 0,
    categoryBreakdown = [],
    businessBreakdown = [],
  } = reportData || {};

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
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Reports</h1>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="flex-1" data-testid="select-month">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
            <SelectTrigger className="flex-1" data-testid="select-business">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {(businesses || []).map((b: any) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="font-bold text-base text-green-600 dark:text-green-400">
                  {formatCurrency(totalRevenue)}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="font-bold text-base text-red-600 dark:text-red-400">
                  {formatCurrency(totalExpenses)}
                </p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className={`font-bold text-base ${profit >= 0 ? 'text-primary' : 'text-red-600'}`}>
                  {formatCurrency(profit)}
                </p>
              </Card>
            </div>

            {categoryBreakdown.length > 0 && (
              <DonutChart title="Expenses by Category" data={categoryBreakdown} />
            )}

            {businessBreakdown.length > 0 && (
              <BarChartComponent title="Revenue by Business" data={businessBreakdown} />
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" data-testid="button-export-pdf">
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" className="flex-1" data-testid="button-export-csv">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

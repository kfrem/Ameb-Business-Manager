import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, TrendingDown, Filter, Search, Calendar } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BottomNav } from '@/components/layout/BottomNav';
import { formatCurrency } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function Transactions() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: transactions, isLoading } = useQuery<any[]>({
    queryKey: ['/api/transactions'],
  });

  const { data: businesses } = useQuery<any[]>({
    queryKey: ['/api/businesses'],
  });

  const filteredTransactions = (transactions || []).filter((t: any) => {
    if (filter !== 'all' && t.direction !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        t.counterparty?.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower) ||
        t.reference?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const groupedTransactions = filteredTransactions.reduce((groups: any, t: any) => {
    const date = format(new Date(t.date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
    return groups;
  }, {});

  const getBusiness = (id: string) => businesses?.find((b: any) => b.id === id);

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
          <h1 className="text-lg font-semibold">Transactions</h1>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-28" data-testid="select-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="in">Money In</SelectItem>
              <SelectItem value="out">Money Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : Object.keys(groupedTransactions).length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No transactions found</p>
          </Card>
        ) : (
          Object.entries(groupedTransactions)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txns]) => (
              <div key={date}>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {format(new Date(date), 'EEEE, d MMMM')}
                </p>
                <div className="space-y-2">
                  {(txns as any[]).map(t => {
                    const business = getBusiness(t.businessId);
                    return (
                      <Card
                        key={t.id}
                        className="p-3 hover-elevate cursor-pointer"
                        data-testid={`transaction-${t.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                            t.direction === 'in'
                              ? "bg-green-100 dark:bg-green-950"
                              : "bg-red-100 dark:bg-red-950"
                          )}>
                            {t.direction === 'in' ? (
                              <TrendingUp className="w-5 h-5 text-green-600" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {t.counterparty || t.notes || 'Transaction'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {business?.name}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn(
                              "font-semibold",
                              t.direction === 'in'
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            )}>
                              {t.direction === 'in' ? '+' : '-'}
                              {formatCurrency(parseFloat(t.amount), t.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(t.date), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}

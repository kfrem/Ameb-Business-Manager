import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import {
  Building2, Loader2, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownLeft, Calendar, Hash
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function BankAccountDetail() {
  const params = useParams<{ id: string }>();

  const { data: account, isLoading: accountLoading } = useQuery<any>({
    queryKey: [`/api/bank-accounts/${params.id}`],
  });

  const { data: transactions, isLoading: txLoading } = useQuery<any[]>({
    queryKey: [`/api/bank-accounts/${params.id}/transactions`],
  });

  const isLoading = accountLoading || txLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Bank Account" showBack />
        <main className="p-4">
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Bank account not found</p>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  // Calculate totals
  const totalIn = (transactions || [])
    .filter((t: any) => t.direction === 'in')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  const totalOut = (transactions || [])
    .filter((t: any) => t.direction === 'out')
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  const balance = parseFloat(account.currentBalance || '0');

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title={account.accountRef} showBack />

      <main className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Account Overview */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{account.bankName}</CardTitle>
                <p className="text-sm text-muted-foreground">{account.accountRef}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className={cn(
                "text-4xl font-bold",
                balance >= 0 ? "text-foreground" : "text-red-600"
              )}>
                {formatCurrency(balance, account.currency)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">Total In</p>
                <p className="font-semibold text-green-600">{formatCurrency(totalIn, account.currency)}</p>
              </div>
              <div className="text-center">
                <TrendingDown className="w-5 h-5 mx-auto text-red-500 mb-1" />
                <p className="text-xs text-muted-foreground">Total Out</p>
                <p className="font-semibold text-red-600">{formatCurrency(totalOut, account.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Transaction History</h2>
            <Badge variant="outline">{transactions?.length || 0} transactions</Badge>
          </div>

          {!transactions || transactions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Transactions linked to this account will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <Card key={tx.id} className="hover-elevate cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        tx.direction === 'in'
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                      )}>
                        {tx.direction === 'in' ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {tx.counterparty || tx.subcategory || 'Transaction'}
                          </p>
                          {tx.reference && (
                            <Badge variant="outline" className="text-xs">
                              <Hash className="w-3 h-3 mr-1" />
                              {tx.reference}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(tx.date)}</span>
                          {tx.notes && (
                            <span className="truncate">• {tx.notes}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          tx.direction === 'in' ? "text-green-600" : "text-red-600"
                        )}>
                          {tx.direction === 'in' ? '+' : '-'}
                          {formatCurrency(parseFloat(tx.amount), tx.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

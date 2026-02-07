import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, Building2, Wallet,
  Tag, Calendar, User, FileText, Hash, BookOpen, CreditCard, ChevronRight
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { formatCurrency, formatDateTime } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function TransactionDetail() {
  const [, params] = useRoute('/transaction/:id');
  const [, setLocation] = useLocation();
  const transactionId = params?.id;

  const { data: transaction, isLoading, error } = useQuery<any>({
    queryKey: [`/api/transactions/${transactionId}`],
    enabled: !!transactionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 h-14 px-4">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="w-40 h-6" />
          </div>
        </header>
        <main className="p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/transactions')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Transaction</h1>
          </div>
        </header>
        <main className="p-4">
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Transaction not found</p>
              <Button variant="outline" className="mt-4" onClick={() => setLocation('/transactions')}>
                Back to Transactions
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  const isIn = transaction.direction === 'in';
  const isJournal = transaction.subcategory?.startsWith('journal_');

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className={cn(
        "sticky top-0 z-40",
        isIn ? "bg-green-600 text-white" : "bg-red-600 text-white"
      )}>
        <div className="flex items-center gap-3 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {isIn ? (
            <ArrowDownLeft className="w-5 h-5" />
          ) : (
            <ArrowUpRight className="w-5 h-5" />
          )}
          <h1 className="text-lg font-semibold">
            {isJournal ? 'Journal Entry' : isIn ? 'Money In' : 'Money Out'}
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Amount Card */}
        <Card className={cn(
          "text-center py-6",
          isIn ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" :
                 "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
        )}>
          <CardContent className="p-0">
            <p className="text-sm text-muted-foreground mb-1">
              {isIn ? 'Amount Received' : 'Amount Paid'}
            </p>
            <p className={cn(
              "text-4xl font-bold",
              isIn ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {isIn ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount), transaction.currency)}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant={transaction.status === 'posted' ? 'default' : 'secondary'}>
                {transaction.status}
              </Badge>
              {transaction.reconciled && (
                <Badge variant="outline" className="text-green-600">Reconciled</Badge>
              )}
              {isJournal && (
                <Badge variant="outline" className="text-blue-600">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Journal
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="font-medium">{formatDateTime(transaction.date)}</p>
              </div>
            </div>

            {/* Business - clickable */}
            {transaction.businessName && (
              <Link href={`/business/${transaction.businessId}`}>
                <div className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-muted/50 cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Business</p>
                    <p className="font-medium">{transaction.businessName}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
              </Link>
            )}

            {/* Category */}
            {transaction.categoryName && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{transaction.categoryName}</p>
                </div>
              </div>
            )}

            {/* Bank Account - clickable */}
            {transaction.bankAccountName && (
              <Link href={`/bank/${transaction.bankAccountId}`}>
                <div className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-muted/50 cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Bank Account</p>
                    <p className="font-medium">{transaction.bankAccountName}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
              </Link>
            )}

            {/* Counterparty */}
            {transaction.counterparty && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isIn ? 'Received From' : 'Paid To'}
                  </p>
                  <p className="font-medium">{transaction.counterparty}</p>
                </div>
              </div>
            )}

            {/* Reference */}
            {transaction.reference && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="font-medium">{transaction.reference}</p>
                </div>
              </div>
            )}

            {/* Journal type */}
            {isJournal && transaction.subcategory && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Journal Type</p>
                  <p className="font-medium capitalize">
                    {transaction.subcategory.replace('journal_', '').replace('_', ' ')}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {transaction.notes && (
              <div className="flex items-start gap-3 pt-2 border-t">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-0.5">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{transaction.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Currency</span>
              </div>
              <Badge variant="outline">{transaction.currency}</Badge>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

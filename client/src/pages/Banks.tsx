import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Plus, ArrowRightLeft } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { formatCurrency } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Banks() {
  const [, setLocation] = useLocation();

  const { data: bankAccounts, isLoading } = useQuery({
    queryKey: ['/api/bank-accounts'],
  });

  const totalBalance = (bankAccounts || []).reduce(
    (sum: number, b: any) => sum + parseFloat(b.currentBalance || 0),
    0
  );

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
          <Building2 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Bank Accounts</h1>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-sm opacity-90">Total Balance</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" data-testid="button-transfer">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Transfer
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(bankAccounts || []).map((bank: any) => (
              <Card
                key={bank.id}
                className="hover-elevate cursor-pointer"
                data-testid={`bank-${bank.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{bank.accountRef}</p>
                      <p className="text-sm text-muted-foreground">{bank.bankName}</p>
                      <Badge variant="outline" className="mt-2">
                        {bank.currency}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xl font-bold",
                        parseFloat(bank.currentBalance) >= 0
                          ? "text-foreground"
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {formatCurrency(parseFloat(bank.currentBalance), bank.currency)}
                      </p>
                      {bank.reconciled && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Reconciled
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

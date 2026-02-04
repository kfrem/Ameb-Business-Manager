import { Wallet, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface BankBalance {
  id: string;
  bankName: string;
  accountRef: string;
  currency: string;
  balance: number;
}

interface MoneyOverviewProps {
  totalBalance: number;
  todayIn: number;
  todayOut: number;
  banks: BankBalance[];
}

export function MoneyOverview({ totalBalance, todayIn, todayOut, banks }: MoneyOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Wallet className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold text-lg">{formatCurrency(totalBalance)}</p>
        </Card>
        
        <Card className="p-3 text-center">
          <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-1" />
          <p className="text-xs text-muted-foreground">In Today</p>
          <p className="font-bold text-lg text-green-600 dark:text-green-400">
            {formatCurrency(todayIn)}
          </p>
        </Card>
        
        <Card className="p-3 text-center">
          <TrendingDown className="w-6 h-6 mx-auto text-red-500 mb-1" />
          <p className="text-xs text-muted-foreground">Out Today</p>
          <p className="font-bold text-lg text-red-600 dark:text-red-400">
            {formatCurrency(todayOut)}
          </p>
        </Card>
      </div>

      <Link href="/banks">
        <Card className="hover-elevate cursor-pointer">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Bank Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {banks.slice(0, 4).map(bank => (
                <div key={bank.id} className="flex items-center justify-between py-1">
                  <div>
                    <p className="font-medium text-sm">{bank.accountRef}</p>
                    <p className="text-xs text-muted-foreground">{bank.bankName}</p>
                  </div>
                  <span className={cn(
                    "font-semibold",
                    bank.balance >= 0 ? "text-foreground" : "text-red-600"
                  )}>
                    {formatCurrency(bank.balance, bank.currency)}
                  </span>
                </div>
              ))}
              {banks.length > 4 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{banks.length - 4} more accounts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

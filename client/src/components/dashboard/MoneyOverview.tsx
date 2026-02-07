import { Wallet, TrendingUp, TrendingDown, Building2, ChevronRight } from 'lucide-react';
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
        {/* Total Balance — links to all bank accounts */}
        <Link href="/banks">
          <Card className="p-3 text-center hover:bg-muted/50 cursor-pointer transition-colors">
            <Wallet className="w-6 h-6 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-lg">{formatCurrency(totalBalance)}</p>
            <p className="text-[10px] text-primary mt-0.5">Tap to view</p>
          </Card>
        </Link>

        {/* Today In — links to today's transactions filtered to Money In */}
        <Link href="/transactions?filter=in&period=today">
          <Card className="p-3 text-center hover:bg-muted/50 cursor-pointer transition-colors">
            <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-1" />
            <p className="text-xs text-muted-foreground">In Today</p>
            <p className="font-bold text-lg text-green-600 dark:text-green-400">
              {formatCurrency(todayIn)}
            </p>
            <p className="text-[10px] text-green-600 mt-0.5">Tap to view</p>
          </Card>
        </Link>

        {/* Today Out — links to today's transactions filtered to Money Out */}
        <Link href="/transactions?filter=out&period=today">
          <Card className="p-3 text-center hover:bg-muted/50 cursor-pointer transition-colors">
            <TrendingDown className="w-6 h-6 mx-auto text-red-500 mb-1" />
            <p className="text-xs text-muted-foreground">Out Today</p>
            <p className="font-bold text-lg text-red-600 dark:text-red-400">
              {formatCurrency(todayOut)}
            </p>
            <p className="text-[10px] text-red-600 mt-0.5">Tap to view</p>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Bank Accounts</CardTitle>
          <Link href="/banks" className="ml-auto text-xs text-muted-foreground hover:text-primary">
            View All
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {banks.slice(0, 4).map(bank => (
              <Link key={bank.id} href={`/bank/${bank.id}`}>
                <div className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{bank.accountRef}</p>
                      <p className="text-xs text-muted-foreground">{bank.bankName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold",
                      bank.balance >= 0 ? "text-foreground" : "text-red-600"
                    )}>
                      {formatCurrency(bank.balance, bank.currency)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            ))}
            {banks.length > 4 && (
              <Link href="/banks">
                <p className="text-sm text-primary text-center pt-2 hover:underline cursor-pointer">
                  +{banks.length - 4} more accounts
                </p>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

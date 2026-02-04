import { Link } from 'wouter';
import { Truck, Gem, Crown, Wrench, Fuel, LucideIcon, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatCompactNumber } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface BusinessTileProps {
  id: string;
  name: string;
  type: string;
  cashIn?: number;
  cashOut?: number;
  profit?: number;
  alertCount?: number;
}

const iconMap: Record<string, LucideIcon> = {
  machinery: Truck,
  gold_agent: Gem,
  gold_owner: Crown,
  spare_parts: Wrench,
  fuel: Fuel,
};

const colorMap: Record<string, string> = {
  machinery: 'bg-blue-500',
  gold_agent: 'bg-yellow-500',
  gold_owner: 'bg-amber-500',
  spare_parts: 'bg-purple-500',
  fuel: 'bg-orange-500',
};

export function BusinessTile({ id, name, type, cashIn = 0, cashOut = 0, profit = 0, alertCount = 0 }: BusinessTileProps) {
  const Icon = iconMap[type] || Truck;
  const bgColor = colorMap[type] || 'bg-gray-500';

  return (
    <Link href={`/business/${id}`}>
      <Card 
        className="p-4 hover-elevate active-elevate-2 cursor-pointer relative overflow-visible"
        data-testid={`tile-business-${type}`}
      >
        {alertCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center p-0 rounded-full text-xs"
          >
            {alertCount}
          </Badge>
        )}
        
        <div className="flex items-start gap-3">
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-white shrink-0", bgColor)}>
            <Icon className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{name}</h3>
            
            <div className="flex items-center gap-3 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCompactNumber(cashIn)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatCompactNumber(cashOut)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Profit</span>
            <span className={cn(
              "font-bold text-lg",
              profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {formatCurrency(profit)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Package, Search, Filter, Truck, Gem, Wrench, Fuel,
  AlertTriangle, Clock, CheckCircle, XCircle, ChevronRight
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BottomNav } from '@/components/layout/BottomNav';
import { formatCurrency } from '@/lib/constants';
import { cn } from '@/lib/utils';

const stockTypeIcons: Record<string, any> = {
  machinery: Truck,
  gold: Gem,
  inventory: Wrench,
  fuel: Fuel,
};

const stockTypeLabels: Record<string, string> = {
  machinery: 'Machinery',
  gold: 'Gold',
  inventory: 'Spare Parts',
  fuel: 'Fuel',
};

function getAgeLabel(days: number): { label: string; color: string; level: string } {
  if (days <= 30) return { label: `${days}d`, color: 'text-green-600 bg-green-100 dark:bg-green-900/30', level: 'new' };
  if (days <= 90) return { label: `${Math.floor(days / 30)}mo`, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', level: 'recent' };
  if (days <= 365) return { label: `${Math.floor(days / 30)}mo`, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30', level: 'aging' };
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return { label: `${years}y${months > 0 ? ` ${months}m` : ''}`, color: 'text-red-600 bg-red-100 dark:bg-red-900/30', level: 'old' };
}

function getStatusInfo(status: string): { icon: any; color: string; label: string } {
  switch (status) {
    case 'ordered': return { icon: Clock, color: 'text-blue-500', label: 'Ordered' };
    case 'shipping': return { icon: Truck, color: 'text-blue-500', label: 'Shipping' };
    case 'clearing': return { icon: Clock, color: 'text-yellow-500', label: 'Clearing' };
    case 'transport': return { icon: Truck, color: 'text-yellow-500', label: 'In Transit' };
    case 'storage': return { icon: Package, color: 'text-purple-500', label: 'In Storage' };
    case 'on_lease': return { icon: CheckCircle, color: 'text-green-500', label: 'On Lease' };
    case 'sold': return { icon: CheckCircle, color: 'text-gray-500', label: 'Sold' };
    case 'funded': return { icon: Clock, color: 'text-blue-500', label: 'Funded' };
    case 'in_hand': return { icon: Package, color: 'text-green-500', label: 'In Hand' };
    case 'in_stock': return { icon: CheckCircle, color: 'text-green-500', label: 'In Stock' };
    case 'low_stock': return { icon: AlertTriangle, color: 'text-yellow-500', label: 'Low Stock' };
    case 'out_of_stock': return { icon: XCircle, color: 'text-red-500', label: 'Out of Stock' };
    case 'summary': return { icon: Fuel, color: 'text-blue-500', label: 'Summary' };
    default: return { icon: Package, color: 'text-gray-500', label: status };
  }
}

export default function Stock() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('age_desc');

  const { data: stock, isLoading } = useQuery<any[]>({
    queryKey: ['/api/stock'],
    queryFn: async () => {
      const savedUser = localStorage.getItem('amt_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;
      const headers: Record<string, string> = {};
      if (userId) headers['X-User-Id'] = userId;
      const res = await fetch('/api/stock', { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const filtered = (stock || []).filter((item: any) => {
    if (typeFilter !== 'all' && item.stockType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        item.name?.toLowerCase().includes(s) ||
        item.businessName?.toLowerCase().includes(s) ||
        item.serialNumber?.toLowerCase().includes(s) ||
        item.location?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'age_desc': return b.ageInDays - a.ageInDays; // oldest first
      case 'age_asc': return a.ageInDays - b.ageInDays;  // newest first
      case 'value_desc': return b.totalCost - a.totalCost;
      case 'value_asc': return a.totalCost - b.totalCost;
      case 'name_asc': return a.name.localeCompare(b.name);
      default: return b.ageInDays - a.ageInDays;
    }
  });

  // Summary stats
  const totalItems = filtered.length;
  const totalValue = filtered.reduce((sum: number, i: any) => sum + (i.totalCost || 0), 0);
  const oldItems = filtered.filter((i: any) => i.ageInDays > 365).length;
  const lowStockItems = filtered.filter((i: any) => i.status === 'low_stock' || i.status === 'out_of_stock').length;

  // Determine which stock types exist
  const existingTypes = [...new Set((stock || []).map((i: any) => i.stockType))];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Package className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Stock & Assets</h1>
          {totalItems > 0 && (
            <Badge variant="outline" className="ml-auto">{totalItems}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search stock..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className="h-7 text-xs shrink-0"
          >
            All
          </Button>
          {existingTypes.map(t => (
            <Button
              key={t}
              variant={typeFilter === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(t)}
              className="h-7 text-xs shrink-0"
            >
              {stockTypeLabels[t] || t}
            </Button>
          ))}
          <div className="ml-auto shrink-0">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="age_desc">Oldest First</SelectItem>
                <SelectItem value="age_asc">Newest First</SelectItem>
                <SelectItem value="value_desc">Highest Value</SelectItem>
                <SelectItem value="value_asc">Lowest Value</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Items</p>
            <p className="font-bold text-sm">{totalItems}</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Total Value</p>
            <p className="font-bold text-sm">{formatCurrency(totalValue)}</p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Old (&gt;1yr)</p>
            <p className={cn("font-bold text-sm", oldItems > 0 ? "text-red-600" : "text-green-600")}>
              {oldItems}
            </p>
          </Card>
          <Card className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Low Stock</p>
            <p className={cn("font-bold text-sm", lowStockItems > 0 ? "text-yellow-600" : "text-green-600")}>
              {lowStockItems}
            </p>
          </Card>
        </div>

        {/* Stock List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {stock?.length === 0 ? 'No stock items found. Add machinery, gold lots, spare parts, or fuel summaries to see them here.' : 'No items match your search'}
            </p>
            {search && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearch('')}>
                Clear Search
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {sorted.map((item: any) => {
              const TypeIcon = stockTypeIcons[item.stockType] || Package;
              const age = getAgeLabel(item.ageInDays);
              const statusInfo = getStatusInfo(item.status);
              const StatusIcon = statusInfo.icon;

              return (
                <Link key={`${item.stockType}-${item.id}`} href={`/stock/${item.stockType}/${item.id}`}>
                  <Card className="hover-elevate cursor-pointer transition-colors hover:bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Type Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          item.stockType === 'machinery' ? "bg-blue-100 dark:bg-blue-900/30" :
                          item.stockType === 'gold' ? "bg-yellow-100 dark:bg-yellow-900/30" :
                          item.stockType === 'inventory' ? "bg-purple-100 dark:bg-purple-900/30" :
                          "bg-orange-100 dark:bg-orange-900/30"
                        )}>
                          <TypeIcon className={cn(
                            "w-5 h-5",
                            item.stockType === 'machinery' ? "text-blue-600" :
                            item.stockType === 'gold' ? "text-yellow-600" :
                            item.stockType === 'inventory' ? "text-purple-600" :
                            "text-orange-600"
                          )} />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate">{item.businessName}</p>
                            {item.location && (
                              <span className="text-xs text-muted-foreground">• {item.location}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {/* Status badge */}
                            <div className="flex items-center gap-1">
                              <StatusIcon className={cn("w-3 h-3", statusInfo.color)} />
                              <span className="text-[10px] text-muted-foreground">{statusInfo.label}</span>
                            </div>
                            {/* Quantity for inventory */}
                            {item.unit && item.stockType === 'inventory' && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1">
                                {item.quantity} {item.unit}
                              </Badge>
                            )}
                            {/* Gold grams */}
                            {item.unit === 'grams' && item.quantity > 0 && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1">
                                {item.quantity}g
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Right side: Age + Value */}
                        <div className="text-right shrink-0 space-y-1">
                          {/* Age badge */}
                          <div className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", age.color)}>
                            <Clock className="w-3 h-3" />
                            {age.label}
                          </div>
                          {/* Value */}
                          <p className="font-semibold text-sm">
                            {formatCurrency(item.totalCost)}
                          </p>
                          {item.salePrice && item.salePrice > 0 && item.status !== 'sold' && (
                            <p className="text-[10px] text-green-600">
                              Sale: {formatCurrency(item.salePrice)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

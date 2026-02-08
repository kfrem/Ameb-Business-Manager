import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Package, Truck, Gem, Wrench, Fuel, Building2,
  Clock, Calendar, Hash, MapPin, DollarSign, FileText,
  TrendingUp, TrendingDown, ChevronRight, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { formatCurrency, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, any> = {
  machinery: Truck,
  gold: Gem,
  inventory: Wrench,
  fuel: Fuel,
};

const typeLabels: Record<string, string> = {
  machinery: 'Machinery Asset',
  gold: 'Gold Lot',
  inventory: 'Spare Part / Inventory',
  fuel: 'Fuel Summary',
};

function getAgeBadge(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return { label: `${days} days old`, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  if (days <= 90) return { label: `${Math.floor(days / 30)} months old`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
  if (days <= 365) return { label: `${Math.floor(days / 30)} months old`, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return { label: `${years} year${years > 1 ? 's' : ''}${months > 0 ? ` ${months}mo` : ''} old`, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
}

export default function StockDetail() {
  const [, params] = useRoute('/stock/:type/:id');
  const [, setLocation] = useLocation();
  const stockType = params?.type || '';
  const stockId = params?.id || '';

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/stock/${stockType}/${stockId}`],
    queryFn: async () => {
      const savedUser = localStorage.getItem('amt_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;
      const headers: Record<string, string> = {};
      if (userId) headers['X-User-Id'] = userId;
      const res = await fetch(`/api/stock/${stockType}/${stockId}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!stockType && !!stockId,
  });

  const Icon = typeIcons[stockType] || Package;

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
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (error || !data?.item) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="flex items-center gap-3 h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/stock')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Stock Item</h1>
          </div>
        </header>
        <main className="p-4">
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Stock item not found</p>
              <Button variant="outline" className="mt-4" onClick={() => setLocation('/stock')}>
                Back to Stock
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  const { item, businessName, costHistory = [], movements = [], leases = [] } = data;
  const age = getAgeBadge(item.createdAt);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className={cn(
        "sticky top-0 z-40 text-white",
        stockType === 'machinery' ? "bg-blue-600" :
        stockType === 'gold' ? "bg-yellow-600" :
        stockType === 'inventory' ? "bg-purple-600" :
        "bg-orange-600"
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
          <Icon className="w-5 h-5" />
          <h1 className="text-lg font-semibold truncate">{typeLabels[stockType] || 'Stock'}</h1>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Name & Age Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {stockType === 'machinery' ? item.assetType : item.name || item.stream || 'Stock Item'}
                </h2>
                {businessName && (
                  <Link href={`/business/${item.businessId}`}>
                    <p className="text-sm text-primary hover:underline cursor-pointer mt-1">
                      {businessName}
                    </p>
                  </Link>
                )}
              </div>
              <Badge className={cn("text-xs", age.color)}>
                <Clock className="w-3 h-3 mr-1" />
                {age.label}
              </Badge>
            </div>

            {/* Status */}
            <div className="mt-3">
              <Badge variant="outline" className="capitalize">
                {(item.status || '').replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <TrendingDown className="w-5 h-5 mx-auto text-red-500 mb-1" />
            <p className="text-[10px] text-muted-foreground">
              {stockType === 'machinery' ? 'Purchase' : stockType === 'gold' ? 'Funding' : 'Cost'}
            </p>
            <p className="font-bold text-sm text-red-600">
              {formatCurrency(item.purchasePrice ? parseFloat(item.purchasePrice) : 0)}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-[10px] text-muted-foreground">Total Cost</p>
            <p className="font-bold text-sm">
              {formatCurrency(item.totalCost ? parseFloat(item.totalCost) : 0)}
            </p>
          </Card>
          <Card className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-[10px] text-muted-foreground">
              {stockType === 'fuel' ? 'Sales' : 'Sale Price'}
            </p>
            <p className="font-bold text-sm text-green-600">
              {item.salePrice || item.saleValue || item.totalSales
                ? formatCurrency(parseFloat(item.salePrice || item.saleValue || item.totalSales || '0'))
                : 'N/A'}
            </p>
          </Card>
        </div>

        {/* Details Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Date */}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Added On</p>
                <p className="text-sm font-medium">{formatDate(item.createdAt)}</p>
              </div>
            </div>

            {/* Serial Number (machinery) */}
            {item.serialNumber && (
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Serial Number</p>
                  <p className="text-sm font-medium">{item.serialNumber}</p>
                </div>
              </div>
            )}

            {/* Chassis Number (machinery) */}
            {item.chassisNumber && (
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Chassis Number</p>
                  <p className="text-sm font-medium">{item.chassisNumber}</p>
                </div>
              </div>
            )}

            {/* SKU (inventory) */}
            {item.sku && (
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">SKU</p>
                  <p className="text-sm font-medium">{item.sku}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {item.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{item.location}</p>
                </div>
              </div>
            )}

            {/* Quantity (inventory) */}
            {item.quantity !== undefined && stockType === 'inventory' && (
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Quantity in Stock</p>
                  <p className={cn(
                    "text-sm font-medium",
                    item.quantity <= 0 ? "text-red-600" :
                    item.quantity <= (item.reorderLevel || 5) ? "text-yellow-600" :
                    "text-green-600"
                  )}>
                    {item.quantity} units
                    {item.quantity <= (item.reorderLevel || 5) && item.quantity > 0 && ' (Low!)'}
                    {item.quantity <= 0 && ' (Out of stock!)'}
                  </p>
                </div>
              </div>
            )}

            {/* Gold-specific: grams */}
            {item.gramsReceived && (
              <div className="flex items-center gap-3">
                <Gem className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Grams Received</p>
                  <p className="text-sm font-medium">{parseFloat(item.gramsReceived)}g</p>
                </div>
              </div>
            )}

            {/* Gold stream */}
            {item.stream && (
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Stream</p>
                  <p className="text-sm font-medium">{item.stream}</p>
                </div>
              </div>
            )}

            {/* Fuel: week dates */}
            {item.weekStartDate && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-sm font-medium">
                    {formatDate(item.weekStartDate)} - {formatDate(item.weekEndDate)}
                  </p>
                </div>
              </div>
            )}

            {/* Fuel shares */}
            {item.ownerSharePct && (
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Owner Share</p>
                  <p className="text-sm font-medium">
                    {parseFloat(item.ownerSharePct)}% = {formatCurrency(parseFloat(item.expectedOwnerShare || '0'))}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="flex items-start gap-3 pt-2 border-t">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{item.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost History (Machinery) */}
        {costHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cost History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {costHistory.map((cl: any) => (
                  <div key={cl.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium capitalize">{cl.category}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(cl.date)}</p>
                      {cl.notes && <p className="text-xs text-muted-foreground">{cl.notes}</p>}
                    </div>
                    <p className="font-semibold text-red-600">
                      -{formatCurrency(parseFloat(cl.amount))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Movements */}
        {movements.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Movement History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {movements.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      m.movementType === 'in' ? "bg-green-100" : "bg-red-100"
                    )}>
                      {m.movementType === 'in' ? (
                        <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {m.movementType === 'in' ? 'Stock In' : 'Stock Out'}: {m.quantity} units
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</p>
                      {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                    </div>
                    {m.totalAmount && (
                      <p className={cn(
                        "font-semibold text-sm",
                        m.movementType === 'in' ? "text-red-600" : "text-green-600"
                      )}>
                        {formatCurrency(parseFloat(m.totalAmount))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lease Contracts (Machinery) */}
        {leases.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lease Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leases.map((lease: any) => (
                  <div key={lease.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{lease.lesseeName}</p>
                      <Badge variant={lease.isActive ? 'default' : 'secondary'}>
                        {lease.isActive ? 'Active' : 'Ended'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Rate</p>
                        <p className="font-medium">{formatCurrency(parseFloat(lease.monthlyRate))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Start Date</p>
                        <p className="font-medium">{formatDate(lease.startDate)}</p>
                      </div>
                    </div>
                    {lease.payments && lease.payments.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">
                          Payments: {lease.payments.filter((p: any) => p.isPaid).length}/{lease.payments.length}
                        </p>
                        <div className="flex gap-1">
                          {lease.payments.slice(0, 12).map((p: any) => (
                            <div
                              key={p.id}
                              className={cn(
                                "w-4 h-4 rounded-sm",
                                p.isPaid ? "bg-green-500" : "bg-red-200"
                              )}
                              title={`${formatDate(p.dueDate)}: ${p.isPaid ? 'Paid' : 'Unpaid'}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

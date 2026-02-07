import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Clock, ChevronRight, Briefcase, Plus,
         Users, Truck, Building2, Wallet, UserCog, FileText, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BusinessTile } from '@/components/dashboard/BusinessTile';
import { MoneyOverview } from '@/components/dashboard/MoneyOverview';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { ApprovalsList } from '@/components/dashboard/ApprovalsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';

const BUSINESS_TYPES = [
  { value: 'machinery', label: 'Machinery' },
  { value: 'gold_agent', label: 'Gold Agent' },
  { value: 'gold_owner', label: 'Gold Owner' },
  { value: 'spare_parts', label: 'Spare Parts' },
  { value: 'fuel', label: 'Fuel' },
];

const GHANA_LOCATIONS = [
  'Accra', 'Tema', 'Kumasi', 'Obuasi', 'Tamale',
  'Sekondi-Takoradi', 'Sunyani', 'Cape Coast', 'Koforidua', 'Techiman'
];

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === 'owner';

  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizType, setNewBizType] = useState('');
  const [newBizLocation, setNewBizLocation] = useState('');

  const { data: dashboardData, isLoading } = useQuery<any>({
    queryKey: ['/api/dashboard'],
  });

  const { data: alerts } = useQuery<any[]>({
    queryKey: ['/api/alerts'],
  });

  const { data: approvals } = useQuery<any[]>({
    queryKey: ['/api/approvals'],
    enabled: isOwner,
  });

  const createBusiness = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/businesses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/businesses'] });
      toast({ title: 'Business created!' });
      setShowAddBusiness(false);
      setNewBizName('');
      setNewBizType('');
      setNewBizLocation('');
    },
    onError: () => toast({ title: 'Failed to create business', variant: 'destructive' }),
  });

  const handleCreateBusiness = () => {
    if (!newBizName || newBizName.length < 2) {
      toast({ title: 'Business name is required', variant: 'destructive' });
      return;
    }
    if (!newBizType) {
      toast({ title: 'Select a business type', variant: 'destructive' });
      return;
    }
    createBusiness.mutate({
      name: newBizName,
      type: newBizType,
      location: newBizLocation || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const {
    businesses = [],
    bankAccounts = [],
    todayIn = 0,
    todayOut = 0,
    totalBalance = 0,
  } = dashboardData || {};

  const unreadAlerts = (alerts || []).filter((a: any) => !a.isRead);
  const pendingApprovals = (approvals || []).filter((a: any) => a.status === 'pending');

  const quickActions = [
    { label: 'New Entry', icon: Plus, href: '/new-entry', color: 'text-primary' },
    { label: 'Customers', icon: Users, href: '/customers', color: 'text-blue-500' },
    { label: 'Suppliers', icon: Truck, href: '/suppliers', color: 'text-orange-500' },
    { label: 'Banks', icon: Building2, href: '/banks', color: 'text-green-600' },
    { label: 'Users', icon: UserCog, href: '/admin/users', color: 'text-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="AMT" />

      <main className="p-4 space-y-6 max-w-2xl mx-auto">
        {isOwner && pendingApprovals.length > 0 && (
          <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {pendingApprovals.length}
              </Badge>
            </CardHeader>
            <CardContent>
              <ApprovalsList approvals={pendingApprovals} limit={2} />
            </CardContent>
          </Card>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Money Overview</h2>
          </div>
          <MoneyOverview
            totalBalance={totalBalance}
            todayIn={todayIn}
            todayOut={todayOut}
            banks={bankAccounts}
          />
        </section>

        {isOwner && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map(action => (
                <Link key={action.label} href={action.href}>
                  <Card className="hover-elevate cursor-pointer">
                    <CardContent className="p-3 text-center">
                      <action.icon className={`w-6 h-6 mx-auto mb-1 ${action.color}`} />
                      <p className="text-xs font-medium">{action.label}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              <Card
                className="hover-elevate cursor-pointer"
                onClick={() => setShowAddBusiness(true)}
              >
                <CardContent className="p-3 text-center">
                  <Briefcase className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                  <p className="text-xs font-medium">Add Business</p>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {showAddBusiness && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">New Business</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAddBusiness(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                placeholder="Business name *"
                value={newBizName}
                onChange={e => setNewBizName(e.target.value)}
              />
              <Select value={newBizType} onValueChange={setNewBizType}>
                <SelectTrigger>
                  <SelectValue placeholder="Business type *" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map(bt => (
                    <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newBizLocation} onValueChange={setNewBizLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {GHANA_LOCATIONS.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                onClick={handleCreateBusiness}
                disabled={createBusiness.isPending}
              >
                {createBusiness.isPending ? 'Creating...' : 'Create Business'}
              </Button>
            </CardContent>
          </Card>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Businesses</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{businesses.length}</Badge>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowAddBusiness(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {businesses.length === 0 ? (
            <Card className="text-center py-12" data-testid="empty-state">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Welcome to AMT!</h3>
                  <p className="text-muted-foreground mt-1">
                    {isOwner ? (
                      <>No businesses yet. Use the "Add Business" button above to get started.</>
                    ) : (
                      <>You don't have any businesses yet.<br />Contact the administrator to get started.</>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {businesses.map((business: any) => (
                <BusinessTile
                  key={business.id}
                  id={business.id}
                  name={business.name}
                  type={business.type}
                  cashIn={business.cashIn}
                  cashOut={business.cashOut}
                  profit={business.profit}
                  alertCount={business.alertCount}
                />
              ))}
            </div>
          )}
        </section>

        {unreadAlerts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Alerts
              </h2>
              <Link href="/alerts">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <AlertsList alerts={unreadAlerts} limit={3} />
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

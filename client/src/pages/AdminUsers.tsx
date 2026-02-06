import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserPlus, Loader2, Phone, Shield, Building2,
  Check, X, Key, Eye, PenLine, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { NumericKeypad } from '@/components/forms/NumericKeypad';
import { useAuth } from '@/contexts/AuthContext';

const ROLES = [
  { value: 'staff', label: 'Staff', description: 'Record transactions for assigned businesses' },
  { value: 'partner', label: 'Partner', description: 'View assigned businesses' },
  { value: 'auditor', label: 'Auditor', description: 'View-only access for auditing' },
  { value: 'admin', label: 'Admin', description: 'Manage users and businesses' },
  { value: 'owner', label: 'Owner', description: 'Full access to all features' },
];

const ACCESS_LEVELS = [
  { value: 'full', label: 'Full Access', description: 'View, create, and edit transactions', icon: PenLine, color: 'bg-green-500' },
  { value: 'transactions_only', label: 'Transactions Only', description: 'View and create transactions only', icon: PenLine, color: 'bg-blue-500' },
  { value: 'view_only', label: 'View Only', description: 'Can only view data, no editing', icon: Eye, color: 'bg-amber-500' },
];

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [showPinPad, setShowPinPad] = useState(false);

  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const { data: allBusinesses } = useQuery<any[]>({
    queryKey: ['/api/businesses'],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest('POST', '/api/users', userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User created successfully' });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: error.message || 'Failed to create user', variant: 'destructive' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const res = await apiRequest('PATCH', `/api/users/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User updated' });
    },
    onError: (error: any) => {
      toast({ title: error.message || 'Failed to update user', variant: 'destructive' });
    },
  });

  const assignBusinessMutation = useMutation({
    mutationFn: async ({ userId, businessId, accessLevel }: { userId: string; businessId: string; accessLevel: string }) => {
      const res = await apiRequest('POST', `/api/users/${userId}/businesses`, { businessId, accessLevel });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${variables.userId}/businesses`] });
      toast({ title: 'Business access updated' });
    },
    onError: (error: any) => {
      toast({ title: error.message || 'Failed to update access', variant: 'destructive' });
    },
  });

  const removeAccessMutation = useMutation({
    mutationFn: async ({ userId, businessId }: { userId: string; businessId: string }) => {
      const res = await apiRequest('DELETE', `/api/users/${userId}/businesses/${businessId}`);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${variables.userId}/businesses`] });
      toast({ title: 'Business access removed' });
    },
    onError: (error: any) => {
      toast({ title: error.message || 'Failed to remove access', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setNewName('');
    setNewPhone('');
    setNewPin('');
    setNewRole('staff');
    setShowPinPad(false);
  };

  const handleCreateUser = () => {
    if (!newName || newName.length < 2) {
      toast({ title: 'Name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    if (!newPhone || newPhone.length < 10) {
      toast({ title: 'Phone must be at least 10 digits', variant: 'destructive' });
      return;
    }
    if (!newPin || newPin.length !== 4) {
      toast({ title: 'PIN must be exactly 4 digits', variant: 'destructive' });
      return;
    }

    createUserMutation.mutate({
      name: newName,
      phone: newPhone,
      pin: newPin,
      role: newRole,
    });
  };

  const handleToggleActive = (user: any) => {
    updateUserMutation.mutate({ id: user.id, isActive: !user.isActive });
  };

  const handleResetPin = (user: any) => {
    const tempPin = Math.floor(1000 + Math.random() * 9000).toString();
    updateUserMutation.mutate({
      id: user.id,
      pin: tempPin,
      mustChangePin: true
    });
    toast({
      title: `PIN Reset`,
      description: `New temporary PIN: ${tempPin}. User must change on next login.`
    });
  };

  // Filter roles available to current user
  const availableRoles = currentUser?.role === 'owner'
    ? ROLES
    : ROLES.filter(r => !['owner', 'admin'].includes(r.value));

  if (usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="User Management" showBack />

      <main className="p-4 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Team Members</h2>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="0XX XXX XXXX"
                      className="pl-10"
                      maxLength={12}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span>{role.label}</span>
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Temporary PIN (4 digits)</Label>
                  <p className="text-xs text-muted-foreground">
                    User will be required to change this on first login
                  </p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="password"
                      value={newPin}
                      readOnly
                      placeholder="Enter 4-digit PIN"
                      className="text-center text-2xl tracking-[0.5em]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPinPad(!showPinPad)}
                    >
                      <Key className="w-4 h-4" />
                    </Button>
                  </div>

                  {showPinPad && (
                    <NumericKeypad
                      value={newPin}
                      onChange={setNewPin}
                      maxLength={4}
                      showDecimal={false}
                    />
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {users?.map((user: any) => (
            <UserCard
              key={user.id}
              user={user}
              isExpanded={expandedUser === user.id}
              onToggleExpand={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
              onToggleActive={() => handleToggleActive(user)}
              onResetPin={() => handleResetPin(user)}
              allBusinesses={allBusinesses || []}
              onAssignBusiness={(businessId, accessLevel) =>
                assignBusinessMutation.mutate({ userId: user.id, businessId, accessLevel })
              }
              onRemoveAccess={(businessId) =>
                removeAccessMutation.mutate({ userId: user.id, businessId })
              }
              onUpdateAccessLevel={(businessId, accessLevel) =>
                assignBusinessMutation.mutate({ userId: user.id, businessId, accessLevel })
              }
              isCurrentUser={user.id === currentUser?.id}
            />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

// Separate component for each user card with expandable access management
function UserCard({
  user,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onResetPin,
  allBusinesses,
  onAssignBusiness,
  onRemoveAccess,
  onUpdateAccessLevel,
  isCurrentUser,
}: {
  user: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onResetPin: () => void;
  allBusinesses: any[];
  onAssignBusiness: (businessId: string, accessLevel: string) => void;
  onRemoveAccess: (businessId: string) => void;
  onUpdateAccessLevel: (businessId: string, accessLevel: string) => void;
  isCurrentUser: boolean;
}) {
  const { data: userAccess, isLoading: accessLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${user.id}/businesses`],
    enabled: isExpanded,
  });

  const roleInfo = ROLES.find(r => r.value === user.role);

  // Compute which businesses user already has access to
  const accessMap = new Map<string, string>();
  if (userAccess) {
    userAccess.forEach((a: any) => {
      const bizId = a.businessId || a.business?.id;
      if (bizId) accessMap.set(bizId, a.accessLevel || 'full');
    });
  }

  const unassignedBusinesses = allBusinesses.filter(b => !accessMap.has(b.id));

  return (
    <Card className={!user.isActive ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        {/* User header row */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{user.name}</h3>
              {user.mustChangePin && (
                <Badge variant="secondary" className="text-xs">
                  Must Change PIN
                </Badge>
              )}
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">You</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Phone className="w-3 h-3" />
              <span>{user.phone}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">
                <Shield className="w-3 h-3 mr-1" />
                {roleInfo?.label || user.role}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1 ml-2">
            <Button variant="outline" size="sm" onClick={onToggleActive} disabled={isCurrentUser}>
              {user.isActive ? <><X className="w-3 h-3 mr-1" /> Deactivate</> : <><Check className="w-3 h-3 mr-1" /> Activate</>}
            </Button>
            <Button variant="outline" size="sm" onClick={onResetPin}>
              <Key className="w-3 h-3 mr-1" /> Reset PIN
            </Button>
            <Button
              variant={isExpanded ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleExpand}
            >
              <Building2 className="w-3 h-3 mr-1" />
              Access
              {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Expandable business access section */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Business Access
            </h4>

            {accessLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Current access */}
                {accessMap.size > 0 && (
                  <div className="space-y-2">
                    {Array.from(accessMap.entries()).map(([bizId, level]) => {
                      const biz = allBusinesses.find(b => b.id === bizId) ||
                                  userAccess?.find((a: any) => (a.businessId || a.business?.id) === bizId)?.business;
                      if (!biz) return null;
                      const accessInfo = ACCESS_LEVELS.find(a => a.value === level) || ACCESS_LEVELS[0];
                      return (
                        <div key={bizId} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{biz.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {(biz.type || '').replace('_', ' ')}
                            </p>
                          </div>
                          <Select
                            value={level}
                            onValueChange={(newLevel) => onUpdateAccessLevel(bizId, newLevel)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${accessInfo.color}`} />
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {ACCESS_LEVELS.map((al) => (
                                <SelectItem key={al.value} value={al.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${al.color}`} />
                                    <div>
                                      <span className="text-sm">{al.label}</span>
                                      <p className="text-xs text-muted-foreground">{al.description}</p>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            onClick={() => onRemoveAccess(bizId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {accessMap.size === 0 && (
                  <p className="text-sm text-muted-foreground italic py-2">
                    No business access assigned yet.
                  </p>
                )}

                {/* Add new business access */}
                {unassignedBusinesses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Grant access to:</p>
                    {unassignedBusinesses.map((biz) => (
                      <div key={biz.id} className="flex items-center gap-2 p-3 border border-dashed rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{biz.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {(biz.type || '').replace('_', ' ')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {ACCESS_LEVELS.map((al) => (
                            <Button
                              key={al.value}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => onAssignBusiness(biz.id, al.value)}
                              title={al.description}
                            >
                              <div className={`w-2 h-2 rounded-full ${al.color} mr-1`} />
                              {al.label.split(' ')[0]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {allBusinesses.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No businesses exist yet. Create a business first.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

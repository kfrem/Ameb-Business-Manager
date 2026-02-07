import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserPlus, Loader2, Phone, Shield, Building2,
  Check, X, Edit2, Key, ChevronRight
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { NumericKeypad } from '@/components/forms/NumericKeypad';

const ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full access to all features' },
  { value: 'admin', label: 'Admin', description: 'Manage users and businesses' },
  { value: 'staff', label: 'Staff', description: 'Record transactions' },
  { value: 'partner', label: 'Partner', description: 'View assigned businesses' },
  { value: 'auditor', label: 'Auditor', description: 'View-only access' },
];

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [showPinPad, setShowPinPad] = useState(false);

  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Fetch ALL businesses (admin endpoint) so owner can assign any business to any user
  const { data: allBusinesses } = useQuery<any[]>({
    queryKey: ['/api/admin/businesses'],
  });

  // Fetch selected user's current business access when dialog opens
  const { data: userBusinesses, refetch: refetchUserBusinesses } = useQuery<any[]>({
    queryKey: ['/api/user-businesses', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const res = await apiRequest('GET', `/api/users/${selectedUser.id}/businesses`);
      return res.json();
    },
    enabled: !!selectedUser?.id && isAssignOpen,
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
      toast({ title: 'User updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: error.message || 'Failed to update user', variant: 'destructive' });
    },
  });

  const assignBusinessMutation = useMutation({
    mutationFn: async ({ userId, businessId }: { userId: string; businessId: string }) => {
      const res = await apiRequest('POST', `/api/users/${userId}/businesses`, { businessId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-businesses', selectedUser?.id] });
      toast({ title: 'Business access granted' });
    },
    onError: (error: any) => {
      toast({ title: error.message || 'Failed to grant access', variant: 'destructive' });
    },
  });

  const revokeBusinessMutation = useMutation({
    mutationFn: async ({ userId, businessId }: { userId: string; businessId: string }) => {
      await apiRequest('DELETE', `/api/users/${userId}/businesses/${businessId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-businesses', selectedUser?.id] });
      toast({ title: 'Business access revoked' });
    },
    onError: (error: any) => {
      toast({ title: error.message || 'Failed to revoke access', variant: 'destructive' });
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
    // Reset to a temporary PIN and require change
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
                      {ROLES.map((role) => (
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
            <Card key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      {user.mustChangePin && (
                        <Badge variant="secondary" className="text-xs">
                          Must Change PIN
                        </Badge>
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
                        {ROLES.find(r => r.value === user.role)?.label || user.role}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.isActive ? (
                        <><X className="w-3 h-3 mr-1" /> Deactivate</>
                      ) : (
                        <><Check className="w-3 h-3 mr-1" /> Activate</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPin(user)}
                    >
                      <Key className="w-3 h-3 mr-1" /> Reset PIN
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsAssignOpen(true);
                      }}
                    >
                      <Building2 className="w-3 h-3 mr-1" /> Businesses
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Assign Business Dialog */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Business Access — {selectedUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Toggle which businesses this user can access:
              </p>
              {allBusinesses?.map((business: any) => {
                const hasAccess = userBusinesses?.some((ub: any) => ub.id === business.id);
                const isPending = assignBusinessMutation.isPending || revokeBusinessMutation.isPending;
                return (
                  <div
                    key={business.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      hasAccess ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{business.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{business.type?.replace('_', ' ')}</p>
                    </div>
                    {hasAccess ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => {
                          revokeBusinessMutation.mutate({
                            userId: selectedUser.id,
                            businessId: business.id,
                          });
                        }}
                      >
                        <X className="w-4 h-4 mr-1" /> Revoke
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={isPending}
                        onClick={() => {
                          assignBusinessMutation.mutate({
                            userId: selectedUser.id,
                            businessId: business.id,
                          });
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" /> Grant
                      </Button>
                    )}
                  </div>
                );
              })}
              {(!allBusinesses || allBusinesses.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No businesses found. Create businesses first.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav />
    </div>
  );
}

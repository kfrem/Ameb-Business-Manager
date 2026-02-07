import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, X, Truck } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/layout/BottomNav';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function Suppliers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterBusiness, setFilterBusiness] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', category: '', notes: '', businessId: '' });

  const { data: suppliers, isLoading } = useQuery<any[]>({ queryKey: ['/api/suppliers'] });
  const { data: businesses } = useQuery<any[]>({ queryKey: ['/api/businesses'] });

  const createSupplier = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({ title: 'Supplier added' });
      resetForm();
    },
    onError: () => toast({ title: 'Failed to add supplier', variant: 'destructive' }),
  });

  const updateSupplier = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PATCH', `/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({ title: 'Supplier updated' });
      resetForm();
    },
    onError: () => toast({ title: 'Failed to update supplier', variant: 'destructive' }),
  });

  const deleteSupplier = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      toast({ title: 'Supplier removed' });
    },
    onError: () => toast({ title: 'Failed to remove supplier', variant: 'destructive' }),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', email: '', address: '', category: '', notes: '', businessId: '' });
  };

  const handleEdit = (supplier: any) => {
    setEditingId(supplier.id);
    setFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      category: supplier.category || '',
      notes: supplier.notes || '',
      businessId: supplier.businessId || '',
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.name || formData.name.length < 2) {
      toast({ title: 'Name is required (2+ characters)', variant: 'destructive' });
      return;
    }
    if (editingId) {
      updateSupplier.mutate({ id: editingId, data: formData });
    } else {
      createSupplier.mutate(formData);
    }
  };

  const businessMap = new Map((businesses || []).map((b: any) => [b.id, b.name]));

  const filtered = (suppliers || []).filter((s: any) => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || '').includes(search);
    const matchesBusiness = filterBusiness === 'all' || s.businessId === filterBusiness;
    return matchesSearch && matchesBusiness;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Truck className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Suppliers</h1>
          <Button size="sm" className="ml-auto" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {showForm && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{editingId ? 'Edit Supplier' : 'New Supplier'}</h3>
                <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
              </div>
              <Input placeholder="Name *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <Input placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              <Input placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              <Input placeholder="Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              <Input placeholder="Category (e.g. Parts, Services)" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              <Select value={formData.businessId || 'none'} onValueChange={v => setFormData({ ...formData, businessId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Link to business (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific business</SelectItem>
                  {(businesses || []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea placeholder="Notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
              <Button className="w-full" onClick={handleSubmit} disabled={createSupplier.isPending || updateSupplier.isPending}>
                {editingId ? 'Update Supplier' : 'Add Supplier'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterBusiness} onValueChange={setFilterBusiness}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All businesses</SelectItem>
              {(businesses || []).map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{search ? 'No suppliers match your search' : 'No suppliers yet. Add your first supplier above.'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((supplier: any) => (
              <Card key={supplier.id} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{supplier.name}</p>
                      {supplier.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {supplier.phone}
                        </p>
                      )}
                      {supplier.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {supplier.email}
                        </p>
                      )}
                      {supplier.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {supplier.address}
                        </p>
                      )}
                      <div className="flex gap-2 mt-1">
                        {supplier.category && <Badge variant="secondary">{supplier.category}</Badge>}
                        {supplier.businessId && businessMap.get(supplier.businessId) && (
                          <Badge variant="outline">{businessMap.get(supplier.businessId)}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteSupplier.mutate(supplier.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
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

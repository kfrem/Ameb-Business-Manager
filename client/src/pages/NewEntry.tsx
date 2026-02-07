import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, TrendingUp, TrendingDown, Camera, Paperclip, Check, FileText, Plus } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AmountInput } from '@/components/forms/AmountInput';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { isOnline, addToOfflineQueue } from '@/lib/offlineQueue';

type Direction = 'in' | 'out';
type EntryType = 'cash' | 'journal';

const JOURNAL_TYPES = [
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'write_off', label: 'Write-Off' },
  { value: 'opening_balance', label: 'Opening Balance' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

export default function NewEntry() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [entryType, setEntryType] = useState<EntryType>('cash');
  const [direction, setDirection] = useState<Direction>('out');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [businessId, setBusinessId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [notes, setNotes] = useState('');
  const [journalType, setJournalType] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [counterpartyMode, setCounterpartyMode] = useState<'select' | 'manual'>('select');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const { data: businesses } = useQuery<any[]>({ queryKey: ['/api/businesses'] });
  const { data: categories } = useQuery<any[]>({
    queryKey: ['/api/categories/by-direction', direction],
    queryFn: () => fetch(`/api/categories/by-direction?direction=${direction}`, {
      headers: { 'X-User-Id': user?.id || '' },
    }).then(r => r.json()),
  });
  const { data: bankAccounts } = useQuery<any[]>({ queryKey: ['/api/bank-accounts'] });
  const { data: customers } = useQuery<any[]>({ queryKey: ['/api/customers'] });
  const { data: suppliers } = useQuery<any[]>({ queryKey: ['/api/suppliers'] });

  const createTransaction = useMutation({
    mutationFn: async (data: any) => apiRequest('POST', '/api/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({ title: entryType === 'journal' ? 'Journal entry saved!' : 'Transaction saved!' });
      setLocation('/');
    },
    onError: (_error: any, variables: any) => {
      if (!isOnline()) {
        addToOfflineQueue(variables);
        toast({ title: 'Saved offline — will sync when back online' });
        setLocation('/');
      } else {
        toast({ title: 'Failed to save', variant: 'destructive' });
      }
    },
  });

  const createCustomer = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/customers', data),
    onSuccess: async (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      const created = await res.json();
      setSelectedCustomerId(created.id);
      setCounterparty(newContactName);
      setShowAddContact(false);
      setNewContactName('');
      setNewContactPhone('');
      toast({ title: 'Customer added' });
    },
  });

  const createSupplier = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/suppliers', data),
    onSuccess: async (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      const created = await res.json();
      setSelectedSupplierId(created.id);
      setCounterparty(newContactName);
      setShowAddContact(false);
      setNewContactName('');
      setNewContactPhone('');
      toast({ title: 'Supplier added' });
    },
  });

  const handleSubmit = () => {
    if (!amount || !businessId) {
      toast({ title: 'Enter amount and select business', variant: 'destructive' });
      return;
    }

    const txData: any = {
      amount,
      currency,
      direction,
      businessId,
      categoryId: categoryId || undefined,
      bankAccountId: entryType === 'cash' ? (bankAccountId || undefined) : undefined,
      counterparty: counterparty || undefined,
      notes: notes || undefined,
      createdBy: user?.id,
      customerId: selectedCustomerId || undefined,
      supplierId: selectedSupplierId || undefined,
      subcategory: entryType === 'journal' ? `journal_${journalType || 'other'}` : undefined,
    };

    if (!isOnline()) {
      addToOfflineQueue(txData);
      toast({ title: 'Saved offline — will sync when back online' });
      setLocation('/');
      return;
    }

    createTransaction.mutate(txData);
  };

  const handleAddContact = () => {
    if (!newContactName || newContactName.length < 2) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    const contactData: any = {
      name: newContactName,
      phone: newContactPhone || undefined,
      businessId: businessId || undefined,
    };
    if (direction === 'in') {
      createCustomer.mutate(contactData);
    } else {
      createSupplier.mutate(contactData);
    }
  };

  const handleCustomerSelect = (value: string) => {
    if (value === 'manual') {
      setCounterpartyMode('manual');
      setSelectedCustomerId('');
      return;
    }
    setSelectedCustomerId(value);
    const customer = (customers || []).find((c: any) => c.id === value);
    if (customer) setCounterparty(customer.name);
  };

  const handleSupplierSelect = (value: string) => {
    if (value === 'manual') {
      setCounterpartyMode('manual');
      setSelectedSupplierId('');
      return;
    }
    setSelectedSupplierId(value);
    const supplier = (suppliers || []).find((s: any) => s.id === value);
    if (supplier) setCounterparty(supplier.name);
  };

  const selectedBusiness = businesses?.find((b: any) => b.id === businessId);
  const filteredCategories = categories?.filter(
    (c: any) => !c.businessType || c.businessType === selectedBusiness?.type
  );

  // Filter customers/suppliers by selected business (or show all)
  const filteredCustomers = (customers || []).filter(
    (c: any) => !c.businessId || !businessId || c.businessId === businessId
  );
  const filteredSuppliers = (suppliers || []).filter(
    (s: any) => !s.businessId || !businessId || s.businessId === businessId
  );

  const totalSteps = entryType === 'journal' ? 3 : 3;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step > 1 ? setStep(step - 1) : setLocation('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">New Entry</h1>
          <div className="ml-auto flex items-center gap-1">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full",
                  s === step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {step === 1 && (
          <div className="space-y-6">
            {/* Entry type toggle */}
            <div className="flex rounded-lg border overflow-hidden">
              <button
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  entryType === 'cash' ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                )}
                onClick={() => setEntryType('cash')}
              >
                Cash Transaction
              </button>
              <button
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  entryType === 'journal' ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                )}
                onClick={() => setEntryType('journal')}
              >
                Journal Entry
              </button>
            </div>

            {entryType === 'cash' ? (
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={cn(
                    "p-6 cursor-pointer hover-elevate",
                    direction === 'in' && "ring-2 ring-green-500"
                  )}
                  onClick={() => { setDirection('in'); setCategoryId(''); }}
                  data-testid="select-money-in"
                >
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p className="font-semibold text-lg">Money In</p>
                    <p className="text-sm text-muted-foreground">Sales, receipts</p>
                  </div>
                </Card>
                <Card
                  className={cn(
                    "p-6 cursor-pointer hover-elevate",
                    direction === 'out' && "ring-2 ring-red-500"
                  )}
                  onClick={() => { setDirection('out'); setCategoryId(''); }}
                  data-testid="select-money-out"
                >
                  <div className="text-center">
                    <TrendingDown className="w-12 h-12 mx-auto text-red-500 mb-2" />
                    <p className="font-semibold text-lg">Money Out</p>
                    <p className="text-sm text-muted-foreground">Expenses, costs</p>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                <Card className={cn("p-6 ring-2 ring-blue-500")}>
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto text-blue-500 mb-2" />
                    <p className="font-semibold text-lg">Journal Entry</p>
                    <p className="text-sm text-muted-foreground">Non-cash adjustments, write-offs, corrections</p>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={cn(
                      "p-3 rounded-lg border text-center transition-colors",
                      direction === 'in' ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "border-border"
                    )}
                    onClick={() => { setDirection('in'); setCategoryId(''); }}
                  >
                    Increase (Credit)
                  </button>
                  <button
                    className={cn(
                      "p-3 rounded-lg border text-center transition-colors",
                      direction === 'out' ? "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400" : "border-border"
                    )}
                    onClick={() => { setDirection('out'); setCategoryId(''); }}
                  >
                    Decrease (Debit)
                  </button>
                </div>

                <Select value={journalType} onValueChange={setJournalType}>
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Select journal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOURNAL_TYPES.map(jt => (
                      <SelectItem key={jt.value} value={jt.value}>{jt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <AmountInput
              value={amount}
              currency={currency}
              onChange={setAmount}
              onCurrencyChange={setCurrency}
            />

            <Button
              className="w-full h-14 text-lg"
              onClick={() => setStep(2)}
              disabled={!amount || parseFloat(amount) <= 0 || (entryType === 'journal' && !journalType)}
              data-testid="button-next-step"
            >
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Business *
              </label>
              <Select value={businessId} onValueChange={setBusinessId}>
                <SelectTrigger className="h-14 text-lg" data-testid="select-business">
                  <SelectValue placeholder="Select business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses?.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Category {direction === 'out' && '*'}
              </label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-14 text-lg" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {entryType === 'cash' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Bank / Cash
                </label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="h-14 text-lg" data-testid="select-bank">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.accountRef} ({b.bankName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              className="w-full h-14 text-lg"
              onClick={() => setStep(3)}
              disabled={!businessId || (direction === 'out' && !categoryId)}
              data-testid="button-next-details"
            >
              Next
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                {direction === 'in' ? 'Customer / Received from' : 'Supplier / Paid to'}
              </label>

              {counterpartyMode === 'select' ? (
                <div className="space-y-2">
                  {direction === 'in' ? (
                    <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                      <SelectTrigger className="h-14 text-lg">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Type manually instead</SelectItem>
                        {filteredCustomers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedSupplierId} onValueChange={handleSupplierSelect}>
                      <SelectTrigger className="h-14 text-lg">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Type manually instead</SelectItem>
                        {filteredSuppliers.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}{s.phone ? ` (${s.phone})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {!showAddContact && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddContact(true)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add new {direction === 'in' ? 'customer' : 'supplier'}
                    </Button>
                  )}

                  {showAddContact && (
                    <Card>
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm font-medium">Quick add {direction === 'in' ? 'customer' : 'supplier'}</p>
                        <Input
                          placeholder="Name *"
                          value={newContactName}
                          onChange={e => setNewContactName(e.target.value)}
                        />
                        <Input
                          placeholder="Phone (optional)"
                          value={newContactPhone}
                          onChange={e => setNewContactPhone(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddContact} disabled={createCustomer.isPending || createSupplier.isPending}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowAddContact(false)}>
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={counterparty}
                    onChange={e => setCounterparty(e.target.value)}
                    placeholder="Name or company"
                    className="h-14 text-lg"
                    data-testid="input-counterparty"
                  />
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => { setCounterpartyMode('select'); setCounterparty(''); }}
                    className="p-0 h-auto"
                  >
                    Switch to select from list
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional details..."
                className="min-h-[100px] text-base"
                data-testid="input-notes"
              />
            </div>

            {entryType === 'cash' && (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-14" data-testid="button-attach-photo">
                  <Camera className="w-5 h-5 mr-2" />
                  Photo
                </Button>
                <Button variant="outline" className="flex-1 h-14" data-testid="button-attach-file">
                  <Paperclip className="w-5 h-5 mr-2" />
                  File
                </Button>
              </div>
            )}

            <Button
              className="w-full h-14 text-lg"
              onClick={handleSubmit}
              disabled={createTransaction.isPending}
              data-testid="button-save-entry"
            >
              {createTransaction.isPending ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  {entryType === 'journal' ? 'Save Journal Entry' : 'Save Entry'}
                </>
              )}
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

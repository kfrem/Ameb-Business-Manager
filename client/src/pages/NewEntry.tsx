import { useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, TrendingUp, TrendingDown, Camera, Paperclip, Check } from 'lucide-react';
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

type Direction = 'in' | 'out';

export default function NewEntry() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<Direction>('out');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [businessId, setBusinessId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [notes, setNotes] = useState('');

  const { data: businesses } = useQuery({ queryKey: ['/api/businesses'] });
  const { data: categories } = useQuery({ queryKey: ['/api/categories'] });
  const { data: bankAccounts } = useQuery({ queryKey: ['/api/bank-accounts'] });

  const createTransaction = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({ title: 'Transaction saved!' });
      setLocation('/');
    },
    onError: () => {
      toast({ title: 'Failed to save', variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!amount || !businessId) {
      toast({ title: 'Enter amount and select business', variant: 'destructive' });
      return;
    }

    createTransaction.mutate({
      amount: amount,
      currency,
      direction,
      businessId,
      categoryId: categoryId || undefined,
      bankAccountId: bankAccountId || undefined,
      counterparty: counterparty || undefined,
      notes: notes || undefined,
      createdBy: user?.id,
    });
  };

  const selectedBusiness = businesses?.find((b: any) => b.id === businessId);
  const filteredCategories = categories?.filter(
    (c: any) => !c.businessType || c.businessType === selectedBusiness?.type
  );

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
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={cn(
                  "p-6 cursor-pointer hover-elevate",
                  direction === 'in' && "ring-2 ring-green-500"
                )}
                onClick={() => setDirection('in')}
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
                onClick={() => setDirection('out')}
                data-testid="select-money-out"
              >
                <div className="text-center">
                  <TrendingDown className="w-12 h-12 mx-auto text-red-500 mb-2" />
                  <p className="font-semibold text-lg">Money Out</p>
                  <p className="text-sm text-muted-foreground">Expenses, costs</p>
                </div>
              </Card>
            </div>

            <AmountInput
              value={amount}
              currency={currency}
              onChange={setAmount}
              onCurrencyChange={setCurrency}
            />

            <Button
              className="w-full h-14 text-lg"
              onClick={() => setStep(2)}
              disabled={!amount || parseFloat(amount) <= 0}
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
                Paid to / Received from
              </label>
              <Input
                value={counterparty}
                onChange={e => setCounterparty(e.target.value)}
                placeholder="Name or company"
                className="h-14 text-lg"
                data-testid="input-counterparty"
              />
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
                  Save Entry
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

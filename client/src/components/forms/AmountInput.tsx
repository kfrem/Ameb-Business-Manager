import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NumericKeypad } from './NumericKeypad';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface AmountInputProps {
  value: string;
  currency: string;
  onChange: (value: string) => void;
  onCurrencyChange: (currency: string) => void;
  label?: string;
  className?: string;
}

export function AmountInput({ 
  value, 
  currency, 
  onChange, 
  onCurrencyChange,
  label = 'Amount',
  className 
}: AmountInputProps) {
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || 'GH₵';
  
  const displayValue = value || '0';
  const formattedValue = parseFloat(displayValue || '0').toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="w-24" data-testid="select-currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map(c => (
              <SelectItem key={c.code} value={c.code}>
                {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Card className="p-4">
        <div className="text-center">
          <span className="text-4xl font-bold" data-testid="amount-display">
            {currencySymbol}{formattedValue}
          </span>
        </div>
      </Card>

      <NumericKeypad value={value} onChange={onChange} />
    </div>
  );
}

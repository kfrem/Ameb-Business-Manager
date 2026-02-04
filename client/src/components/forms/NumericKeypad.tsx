import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  showDecimal?: boolean;
  className?: string;
}

export function NumericKeypad({ 
  value, 
  onChange, 
  onSubmit, 
  maxLength = 12,
  showDecimal = true,
  className 
}: NumericKeypadProps) {
  const handlePress = (digit: string) => {
    if (digit === '.' && value.includes('.')) return;
    if (value.length >= maxLength) return;
    if (digit === '.' && value === '') {
      onChange('0.');
      return;
    }
    onChange(value + digit);
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [showDecimal ? '.' : 'C', '0', 'DEL'],
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {keys.flat().map((key, index) => {
        if (key === 'DEL') {
          return (
            <Button
              key={key}
              variant="outline"
              className="h-14 text-xl font-medium"
              onClick={handleDelete}
              data-testid="keypad-delete"
            >
              <Delete className="w-6 h-6" />
            </Button>
          );
        }
        if (key === 'C') {
          return (
            <Button
              key={key}
              variant="outline"
              className="h-14 text-xl font-medium"
              onClick={handleClear}
              data-testid="keypad-clear"
            >
              C
            </Button>
          );
        }
        return (
          <Button
            key={key}
            variant="secondary"
            className="h-14 text-2xl font-semibold"
            onClick={() => handlePress(key)}
            data-testid={`keypad-${key}`}
          >
            {key}
          </Button>
        );
      })}
    </div>
  );
}

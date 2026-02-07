import { useState } from 'react';
import { useLocation } from 'wouter';
import { Lock, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericKeypad } from '@/components/forms/NumericKeypad';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function ChangePIN() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<'new' | 'confirm'>('new');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isForced = user?.mustChangePin;

  const handleContinue = () => {
    if (newPin.length !== 4) {
      toast({ title: 'PIN must be 4 digits', variant: 'destructive' });
      return;
    }
    setStep('confirm');
  };

  const handleChangePIN = async () => {
    if (confirmPin !== newPin) {
      toast({ title: 'PINs do not match', variant: 'destructive' });
      setConfirmPin('');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/users/change-pin', {
        newPin,
      });

      if (res.ok) {
        toast({ title: 'PIN changed successfully!' });
        // Refresh user data to clear mustChangePin flag
        await refreshUser();
        setLocation('/');
      } else {
        const data = await res.json();
        toast({ title: data.error || 'Failed to change PIN', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Failed to change PIN', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center text-white mb-8">
          <Lock className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold tracking-tight">
            {isForced ? 'Set Your New PIN' : 'Change PIN'}
          </h1>
          {isForced && (
            <p className="text-lg opacity-90 mt-2">
              Your administrator has set a temporary PIN.<br />
              Please create a new PIN to continue.
            </p>
          )}
        </div>

        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {step === 'new' ? 'Enter New PIN' : 'Confirm New PIN'}
            </CardTitle>
            <CardDescription>
              {step === 'new'
                ? 'Choose a 4-digit PIN you will remember'
                : 'Enter the same PIN again to confirm'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'new' ? (
              <>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={newPin}
                    readOnly
                    placeholder="••••"
                    className="pl-10 text-3xl h-14 text-center tracking-[1rem]"
                  />
                </div>

                <div className="flex justify-center gap-3 py-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 ${
                        newPin.length > i ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}
                    />
                  ))}
                </div>

                <NumericKeypad
                  value={newPin}
                  onChange={setNewPin}
                  showDecimal={false}
                  maxLength={4}
                />

                <Button
                  className="w-full h-14 text-lg"
                  onClick={handleContinue}
                  disabled={newPin.length !== 4}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={confirmPin}
                    readOnly
                    placeholder="••••"
                    className="pl-10 text-3xl h-14 text-center tracking-[1rem]"
                  />
                </div>

                <div className="flex justify-center gap-3 py-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 ${
                        confirmPin.length > i
                          ? confirmPin.length === 4 && confirmPin !== newPin
                            ? 'bg-red-500 border-red-500'
                            : 'bg-primary border-primary'
                          : 'border-muted-foreground'
                      }`}
                    />
                  ))}
                </div>

                <NumericKeypad
                  value={confirmPin}
                  onChange={setConfirmPin}
                  showDecimal={false}
                  maxLength={4}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-14"
                    onClick={() => {
                      setStep('new');
                      setNewPin('');
                      setConfirmPin('');
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 h-14 text-lg"
                    onClick={handleChangePIN}
                    disabled={confirmPin.length !== 4 || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Confirm
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="p-4 text-center text-white/70 text-sm">
        AMT Business Manager v1.0
      </div>
    </div>
  );
}

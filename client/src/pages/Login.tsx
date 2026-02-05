import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Phone, Lock, ChevronRight, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericKeypad } from '@/components/forms/NumericKeypad';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = () => {
    if (phone.length < 10) {
      toast({ title: 'Enter valid phone number', variant: 'destructive' });
      return;
    }
    setStep('pin');
  };

  const handleLogin = async () => {
    setIsLoading(true);
    const success = await login(phone, pin);
    setIsLoading(false);
    
    if (success) {
      setLocation('/');
    } else {
      toast({ title: 'Invalid credentials', variant: 'destructive' });
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center text-white mb-8">
          <h1 className="text-5xl font-bold tracking-tight">AMEB</h1>
          <p className="text-lg opacity-90 mt-2">Business Manager</p>
        </div>

        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {step === 'phone' ? 'Enter Phone Number' : 'Enter PIN'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'phone' ? (
              <>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="0XX XXX XXXX"
                    className="pl-10 text-xl h-14 text-center tracking-widest"
                    maxLength={12}
                    data-testid="input-phone"
                  />
                </div>
                
                <NumericKeypad 
                  value={phone} 
                  onChange={setPhone} 
                  showDecimal={false}
                  maxLength={12}
                />

                <Button 
                  className="w-full h-14 text-lg"
                  onClick={handlePhoneSubmit}
                  disabled={phone.length < 10}
                  data-testid="button-continue"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </>
            ) : (
              <>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={pin}
                    readOnly
                    placeholder="••••"
                    className="pl-10 text-3xl h-14 text-center tracking-[1rem]"
                    data-testid="input-pin"
                  />
                </div>
                
                <div className="flex justify-center gap-3 py-2">
                  {[0,1,2,3].map(i => (
                    <div 
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 ${
                        pin.length > i ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}
                    />
                  ))}
                </div>

                <NumericKeypad 
                  value={pin} 
                  onChange={setPin} 
                  showDecimal={false}
                  maxLength={4}
                />

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1 h-14"
                    onClick={() => { setStep('phone'); setPin(''); }}
                  >
                    Back
                  </Button>
                  <Button 
                    className="flex-1 h-14 text-lg"
                    onClick={handleLogin}
                    disabled={pin.length < 4 || isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>

                <Button 
                  variant="ghost" 
                  className="w-full text-sm"
                  onClick={handleLogin}
                >
                  Skip PIN (Demo)
                </Button>
              </>
            )}

            <div className="border-t pt-4 mt-2">
              <Link href="/register">
                <Button 
                  variant="outline" 
                  className="w-full h-12"
                  data-testid="link-register"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create New Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 text-center text-white/70 text-sm">
        AMEB Business Manager v1.0
      </div>
    </div>
  );
}

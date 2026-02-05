import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Phone, Lock, User, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericKeypad } from '@/components/forms/NumericKeypad';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Register() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'name' | 'phone' | 'pin'>('name');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNameSubmit = () => {
    if (name.length < 2) {
      toast({ title: 'Enter your name', variant: 'destructive' });
      return;
    }
    setStep('phone');
  };

  const handlePhoneSubmit = () => {
    if (phone.length < 10) {
      toast({ title: 'Enter valid phone number', variant: 'destructive' });
      return;
    }
    setStep('pin');
  };

  const handleRegister = async () => {
    if (pin.length !== 4) {
      toast({ title: 'PIN must be 4 digits', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    const result = await register(name, phone, pin);
    setIsLoading(false);
    
    if (result.success) {
      toast({ title: 'Account created successfully!' });
      setLocation('/');
    } else {
      toast({ title: result.error || 'Registration failed', variant: 'destructive' });
      if (result.error?.includes('already registered')) {
        setStep('phone');
        setPhone('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center text-white mb-8">
          <h1 className="text-5xl font-bold tracking-tight">AMEB</h1>
          <p className="text-lg opacity-90 mt-2">Create Account</p>
        </div>

        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {step === 'name' && 'Enter Your Name'}
              {step === 'phone' && 'Enter Phone Number'}
              {step === 'pin' && 'Create PIN'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Step {step === 'name' ? '1' : step === 'phone' ? '2' : '3'} of 3
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'name' && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your Name"
                    className="pl-10 text-xl h-14"
                    autoFocus
                    data-testid="input-name"
                  />
                </div>

                <Button 
                  className="w-full h-14 text-lg"
                  onClick={handleNameSubmit}
                  disabled={name.length < 2}
                  data-testid="button-continue-name"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>

                <Link href="/login">
                  <Button variant="ghost" className="w-full text-sm" data-testid="link-login">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Already have an account? Sign In
                  </Button>
                </Link>
              </>
            )}

            {step === 'phone' && (
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

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1 h-14"
                    onClick={() => setStep('name')}
                  >
                    Back
                  </Button>
                  <Button 
                    className="flex-1 h-14 text-lg"
                    onClick={handlePhoneSubmit}
                    disabled={phone.length < 10}
                    data-testid="button-continue-phone"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {step === 'pin' && (
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
                    onClick={handleRegister}
                    disabled={pin.length !== 4 || isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="p-4 text-center text-white/70 text-sm">
        AMEB Business Manager v1.0
      </div>
    </div>
  );
}

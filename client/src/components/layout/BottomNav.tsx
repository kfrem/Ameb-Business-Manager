import { useLocation, Link } from 'wouter';
import { Home, Plus, Heart, Wallet, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/transactions', icon: Wallet, label: 'Money' },
  { path: '/new-entry', icon: Plus, label: 'New', isAction: true },
  { path: '/reports', icon: Heart, label: 'Health' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(item => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          if (item.isAction) {
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg -mt-6 hover-elevate active-elevate-2"
                  data-testid="button-new-entry"
                >
                  <Icon className="w-7 h-7" />
                </button>
              </Link>
            );
          }
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

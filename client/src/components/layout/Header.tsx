import { Menu, Moon, Sun, User, Bell, Users, Key, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onMenuClick?: () => void;
}

export function Header({ title = 'AMEB', showBack, onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
      <div className="flex items-center justify-between gap-2 h-14 px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="text-primary-foreground hover:bg-primary/80"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
          )}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="text-primary-foreground hover:bg-primary/80"
              data-testid="button-menu"
            >
              <Menu className="w-6 h-6" />
            </Button>
          )}
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-primary-foreground hover:bg-primary/80"
            data-testid="button-theme-toggle"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-primary/80"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary-foreground text-primary text-sm font-semibold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                  <Badge variant="outline" className="mt-1 text-xs capitalize">
                    {user.role}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                {isOwnerOrAdmin && (
                  <Link href="/admin/users">
                    <DropdownMenuItem data-testid="button-manage-users">
                      <Users className="w-4 h-4 mr-2" />
                      Manage Users
                    </DropdownMenuItem>
                  </Link>
                )}
                <Link href="/change-pin">
                  <DropdownMenuItem data-testid="button-change-pin">
                    <Key className="w-4 h-4 mr-2" />
                    Change PIN
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="button-logout">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

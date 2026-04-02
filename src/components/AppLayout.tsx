import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Gem, LayoutDashboard, Plus, Users, LogOut, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Дашборд', icon: LayoutDashboard, path: '/dashboard', roles: ['admin', 'operator', 'caster', 'client'] },
    { label: 'Новый заказ', icon: Plus, path: '/orders/new', roles: ['client', 'admin'] },
    { label: 'Заказы', icon: ClipboardList, path: '/admin/orders', roles: ['admin'] },
    { label: 'Пользователи', icon: Users, path: '/admin/users', roles: ['admin'] },
  ];

  const visibleItems = navItems.filter(item => role && item.roles.includes(role));

  const roleLabels: Record<string, string> = {
    admin: 'Администратор',
    operator: 'Оператор',
    caster: 'Литейщик',
    client: 'Клиент',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <Gem className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold gold-text hidden sm:inline">JewelCraft ERP</span>
          </div>

          <nav className="flex items-center gap-1">
            {visibleItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={cn(
                  'gap-2 text-muted-foreground hover:text-foreground',
                  location.pathname === item.path && 'text-primary bg-primary/10'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{role ? roleLabels[role] : ''}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;

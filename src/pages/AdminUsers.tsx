import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Shield } from 'lucide-react';

type AppRole = 'admin' | 'operator' | 'caster' | 'client';

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
}

const roleLabels: Record<AppRole, string> = {
  admin: 'Администратор',
  operator: 'Оператор',
  caster: 'Литейщик',
  client: 'Клиент',
};

const roleBadgeColors: Record<AppRole, string> = {
  admin: 'bg-destructive/20 text-destructive',
  operator: 'bg-warning/20 text-warning',
  caster: 'bg-primary/20 text-primary',
  client: 'bg-muted text-muted-foreground',
};

const AdminUsers: React.FC = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('operator');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email');
    
    if (roles && profiles) {
      const merged: UserWithRole[] = roles.map(r => {
        const profile = profiles.find(p => p.user_id === r.user_id);
        return {
          user_id: r.user_id,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? null,
          role: r.role as AppRole,
        };
      });
      setUsers(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Sign up user via auth
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: { full_name: newName },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Не удалось создать пользователя');

      // Update role (trigger creates 'client' by default, we need to update)
      if (newRole !== 'client') {
        // Wait a bit for trigger to create the role
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', data.user.id);
      }

      toast({ title: 'Пользователь создан', description: `${newName} (${roleLabels[newRole]})` });
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Роль обновлена' });
      fetchUsers();
    }
  };

  if (role !== 'admin') {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Доступ только для администраторов</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Управление пользователями</h1>

        {/* Create user form */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Добавить пользователя
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Имя</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Имя сотрудника" required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Минимум 6 символов" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Оператор</SelectItem>
                    <SelectItem value="caster">Литейщик</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="client">Клиент</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? 'Создание...' : 'Создать пользователя'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Users list */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              Все пользователи ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Загрузка...</p>
            ) : (
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.user_id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.full_name || 'Без имени'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={u.role} onValueChange={(v) => updateRole(u.user_id, v as AppRole)}>
                        <SelectTrigger className="w-40">
                          <Badge className={roleBadgeColors[u.role]}>{roleLabels[u.role]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Администратор</SelectItem>
                          <SelectItem value="operator">Оператор</SelectItem>
                          <SelectItem value="caster">Литейщик</SelectItem>
                          <SelectItem value="client">Клиент</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminUsers;

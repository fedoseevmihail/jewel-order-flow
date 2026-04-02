import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { ORDER_STATUSES, getStatusConfig } from '@/lib/orderStatuses';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Order {
  id: string;
  title: string;
  description: string | null;
  status: string;
  client_id: string;
  work_type: string;
  gallery_folder: string | null;
  tariff: string | null;
  created_at: string;
  updated_at: string;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  growth: 'Р',
  growth_casting: 'Л',
};

const AdminOrders: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .order('updated_at', { ascending: false });

    if (ordersData) {
      setOrders(ordersData as Order[]);
      const clientIds = [...new Set(ordersData.map(o => o.client_id))];
      if (clientIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', clientIds);
        if (profilesData) {
          const map: Record<string, string> = {};
          profilesData.forEach(p => {
            map[p.user_id] = p.full_name || p.email || 'Без имени';
          });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (role === 'admin') fetchData();
  }, [role]);

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab);

  const getCount = (status: string) => orders.filter(o => o.status === status).length;

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('orders').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Заказ удалён' });
      setOrders(prev => prev.filter(o => o.id !== deleteId));
    }
    setDeleteId(null);
  };

  const shortId = (id: string) => id.slice(0, 8).toUpperCase();

  if (role !== 'admin') {
    return <AppLayout><p className="text-muted-foreground">Доступ запрещён</p></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Заказы</h1>
        <p className="text-muted-foreground text-sm mt-1">Управление всеми заказами по этапам</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs">
            Все ({orders.length})
          </TabsTrigger>
          {ORDER_STATUSES.map(s => (
            <TabsTrigger key={s.value} value={s.value} className="text-xs">
              {s.label} ({getCount(s.value)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Заказов не найдено</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Создан</TableHead>
                <TableHead>Изменён</TableHead>
                <TableHead className="w-[60px] text-center">Вид</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Папка</TableHead>
                <TableHead>Тариф</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map(order => {
                const statusCfg = getStatusConfig(order.status);
                return (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {shortId(order.id)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(order.created_at), 'dd.MM.yy', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(order.updated_at), 'dd.MM.yy', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs px-1.5">
                        {WORK_TYPE_LABELS[order.work_type] || 'Р'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {profiles[order.client_id] || '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">
                      {order.title}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.gallery_folder || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.tariff || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusCfg.color + ' text-xs'}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          title="Просмотр"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => navigate(`/orders/${order.id}?edit=true`)}
                          title="Изменить"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(order.id)}
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заказ?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Заказ будет удалён навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AdminOrders;

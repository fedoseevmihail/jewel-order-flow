import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import OrderCard from '@/components/OrderCard';
import { ORDER_STATUSES } from '@/lib/orderStatuses';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface Order {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  client_id: string;
}

const Dashboard: React.FC = () => {
  const { user, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('updated_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData);
        // Fetch client profiles
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

    fetchData();
  }, [user]);

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab);

  const getCount = (status: string) => orders.filter(o => o.status === status).length;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {role === 'client' ? 'Мои заказы' : 'Все заказы'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {role === 'operator' && 'Заказы на этапе роста и далее'}
          {role === 'caster' && 'Заказы на этапе литья и далее'}
          {role === 'admin' && 'Управление всеми заказами'}
          {role === 'client' && 'Ваши заказы на производство'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs">
            Все ({orders.length})
          </TabsTrigger>
          {ORDER_STATUSES.map(s => {
            const count = getCount(s.value);
            if (count === 0 && activeTab !== s.value) return null;
            return (
              <TabsTrigger key={s.value} value={s.value} className="text-xs">
                {s.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Заказов не найдено</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  clientName={role !== 'client' ? profiles[order.client_id] : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Dashboard;

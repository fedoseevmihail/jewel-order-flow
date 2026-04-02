import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getStatusConfig, getNextStatus, ORDER_STATUSES, type OrderStatus } from '@/lib/orderStatuses';
import { ArrowLeft, ArrowRight, Download, FileType, Calendar, User, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import STLViewer from '@/components/STLViewer';

interface Order {
  id: string;
  title: string;
  description: string | null;
  status: string;
  client_id: string;
  operator_id: string | null;
  caster_id: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [files, setFiles] = useState<OrderFile[]>([]);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<OrderFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      const { data } = await supabase.from('orders').select('*').eq('id', id).single();
      if (data) {
        setOrder(data);
        // Get client name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', data.client_id)
          .single();
        if (profile) setClientName(profile.full_name || profile.email || '');
      }

      const { data: filesData } = await supabase
        .from('order_files')
        .select('*')
        .eq('order_id', id);
      if (filesData) setFiles(filesData);
      setLoading(false);
    };
    fetchOrder();
  }, [id]);

  const canAdvance = (): boolean => {
    if (!order || !role) return false;
    const s = order.status as OrderStatus;
    if (role === 'admin') return s !== 'completed';
    if (role === 'client') return s === 'draft';
    if (role === 'operator') return s === 'new' || s === 'growing';
    if (role === 'caster') return s === 'casting';
    return false;
  };

  const advanceOrder = async () => {
    if (!order || !user) return;
    const next = getNextStatus(order.status as OrderStatus);
    if (!next) return;

    const updates: Record<string, any> = { status: next };
    if (next === 'growing') updates.operator_id = user.id;
    if (next === 'casting') updates.caster_id = user.id;

    const { error } = await supabase.from('orders').update(updates).eq('id', order.id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      setOrder({ ...order, ...updates });
      toast({ title: 'Статус обновлён', description: `Заказ переведён: ${getStatusConfig(next).label}` });
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('stl-files').download(filePath);
    if (error || !data) {
      toast({ title: 'Ошибка загрузки', variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPreview = async (file: OrderFile) => {
    const { data, error } = await supabase.storage.from('stl-files').download(file.file_path);
    if (error || !data) {
      toast({ title: 'Ошибка загрузки', variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(data);
    setPreviewUrl(url);
    setPreviewFile(file);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  const deleteOrder = async () => {
    if (!order) return;
    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Заказ удалён' });
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Заказ не найден</p>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const nextStatus = getNextStatus(order.status as OrderStatus);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Назад
        </Button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{order.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(order.created_at).toLocaleDateString('ru-RU')}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {clientName}
              </span>
            </div>
          </div>
          <Badge className={cn('text-sm px-3 py-1', statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Status progress */}
        <Card className="glass-card mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {ORDER_STATUSES.map((s, i) => {
                const isActive = s.value === order.status;
                const isPast = ORDER_STATUSES.findIndex(x => x.value === order.status) > i;
                return (
                  <React.Fragment key={s.value}>
                    {i > 0 && <div className={cn('h-0.5 w-6 shrink-0', isPast ? 'bg-primary' : 'bg-border')} />}
                    <div className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all',
                      isActive ? 'bg-primary text-primary-foreground' :
                      isPast ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                    )}>
                      {s.label}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {order.description && (
          <Card className="glass-card mb-6">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Описание</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-foreground whitespace-pre-wrap">{order.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Files */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">STL-файлы ({files.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {files.length === 0 ? (
              <p className="text-muted-foreground text-sm">Файлы не загружены</p>
            ) : (
              <div className="space-y-2">
                {files.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                    <div className="flex items-center gap-2">
                      <FileType className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{file.file_name}</span>
                      {file.file_size && (
                        <span className="text-xs text-muted-foreground">
                          ({(file.file_size / 1024 / 1024).toFixed(2)} МБ)
                        </span>
                      )}
                    </div>
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openPreview(file)}
                      className="h-8 w-8"
                      title="Просмотр"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadFile(file.file_path, file.file_name)}
                      className="h-8 w-8"
                      title="Скачать"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          {canAdvance() && nextStatus && (
            <Button onClick={advanceOrder} className="gap-2">
              Перевести: {getStatusConfig(nextStatus).label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {role === 'admin' && (
            <Button variant="destructive" onClick={deleteOrder} className="gap-2">
              <Trash2 className="h-4 w-4" /> Удалить
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default OrderDetail;

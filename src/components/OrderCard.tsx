import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStatusConfig } from '@/lib/orderStatuses';
import { FileBox, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    created_at: string;
    client_id: string;
  };
  clientName?: string;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, clientName }) => {
  const navigate = useNavigate();
  const statusConfig = getStatusConfig(order.status);

  return (
    <Card
      className="glass-card hover:border-primary/30 transition-all cursor-pointer animate-fade-in"
      onClick={() => navigate(`/orders/${order.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground truncate">{order.title}</h3>
          <Badge className={cn('shrink-0 text-xs', statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>
        {order.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{order.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(order.created_at).toLocaleDateString('ru-RU')}
          </span>
          {clientName && (
            <span className="flex items-center gap-1">
              <FileBox className="h-3 w-3" />
              {clientName}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;

export type OrderStatus = 'draft' | 'new' | 'growing' | 'casting' | 'shipping' | 'completed';

export const ORDER_STATUSES: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Черновик', color: 'bg-muted text-muted-foreground' },
  { value: 'new', label: 'Новый', color: 'bg-info/20 text-info' },
  { value: 'growing', label: 'В росте', color: 'bg-warning/20 text-warning' },
  { value: 'casting', label: 'В литье', color: 'bg-primary/20 text-primary' },
  { value: 'shipping', label: 'В отгрузке', color: 'bg-accent/20 text-accent-foreground' },
  { value: 'completed', label: 'Завершён', color: 'bg-success/20 text-success' },
];

export const getStatusConfig = (status: string) =>
  ORDER_STATUSES.find((s) => s.value === status) ?? ORDER_STATUSES[0];

export const getNextStatus = (current: OrderStatus): OrderStatus | null => {
  const flow: OrderStatus[] = ['draft', 'new', 'growing', 'casting', 'shipping', 'completed'];
  const idx = flow.indexOf(current);
  return idx < flow.length - 1 ? flow[idx + 1] : null;
};

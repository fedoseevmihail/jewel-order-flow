import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileType } from 'lucide-react';

const CreateOrder: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent, asDraft: boolean) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          title,
          description: description || null,
          status: asDraft ? 'draft' : 'new',
          client_id: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Upload files
      for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${order.id}/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('stl-files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        await supabase.from('order_files').insert({
          order_id: order.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: user.id,
        });
      }

      toast({ title: 'Заказ создан', description: asDraft ? 'Сохранён как черновик' : 'Заказ отправлен в работу' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Новый заказ</h1>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Информация о заказе</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Название изделия</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Кольцо с бриллиантом"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите требования к изделию..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>STL-файлы</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Перетащите файлы или нажмите для выбора
                  </p>
                  <Input
                    type="file"
                    accept=".stl,.STL"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Выбрать файлы
                  </Button>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                        <div className="flex items-center gap-2 text-sm">
                          <FileType className="h-4 w-4 text-primary" />
                          <span className="text-foreground">{file.name}</span>
                          <span className="text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFile(index)} className="h-6 w-6">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={submitting || !title.trim()}
                  className="flex-1"
                >
                  Сохранить черновик
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={submitting || !title.trim()}
                  className="flex-1"
                >
                  {submitting ? 'Создание...' : 'Отправить заказ'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreateOrder;

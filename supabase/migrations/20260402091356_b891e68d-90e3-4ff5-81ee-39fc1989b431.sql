
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'caster', 'client');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'client',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'new', 'growing', 'casting', 'shipping', 'completed')),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES auth.users(id),
  caster_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create order_files table
CREATE TABLE public.order_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;

-- Helper function: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function: get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Anyone can read roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System creates profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Clients see own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    client_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'operator') AND status IN ('growing', 'casting', 'shipping', 'completed'))
    OR (public.has_role(auth.uid(), 'caster') AND status IN ('casting', 'shipping', 'completed'))
  );

CREATE POLICY "Clients can create orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Update orders by role" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    client_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'operator') AND status IN ('new', 'growing'))
    OR (public.has_role(auth.uid(), 'caster') AND status IN ('growing', 'casting'))
  );

CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for order_files
CREATE POLICY "View files for accessible orders" ON public.order_files
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (
        o.client_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (public.has_role(auth.uid(), 'operator') AND o.status IN ('growing', 'casting', 'shipping', 'completed'))
        OR (public.has_role(auth.uid(), 'caster') AND o.status IN ('casting', 'shipping', 'completed'))
      )
    )
  );

CREATE POLICY "Upload files to own orders" ON public.order_files
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (o.client_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can delete files" ON public.order_files
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid());

-- Storage bucket for STL files
INSERT INTO storage.buckets (id, name, public) VALUES ('stl-files', 'stl-files', false);

CREATE POLICY "Auth users can upload STL files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stl-files');

CREATE POLICY "Auth users can view STL files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'stl-files');

CREATE POLICY "Owners and admins can delete STL files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'stl-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

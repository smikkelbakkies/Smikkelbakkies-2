create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text default 'Smikkelbakkies',
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  website text,
  vat_number text,
  chamber_of_commerce_number text,
  notes text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists suppliers_name_active_idx
  on public.suppliers (lower(name))
  where deleted_at is null;

create table if not exists public.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.ingredient_categories(id),
  primary_supplier_id uuid references public.suppliers(id),
  base_unit text not null,
  purchase_unit text not null,
  package_content numeric(12, 3) not null check (package_content > 0),
  purchase_price numeric(12, 2) not null check (purchase_price >= 0),
  price_per_base_unit numeric(12, 4) generated always as (purchase_price / package_content) stored,
  last_price_update timestamptz not null default now(),
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ingredients_name_active_idx
  on public.ingredients (lower(name))
  where deleted_at is null;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  parent_product_id uuid references public.products(id),
  target_gross_margin numeric(5, 2) not null default 70,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  quantity numeric(12, 3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location_type text not null default 'truck',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id),
  location_id uuid not null references public.inventory_locations(id),
  quantity_delta numeric(12, 3) not null,
  movement_type text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  location text,
  people_count integer,
  travel_hours numeric(8, 2) default 0,
  service_hours numeric(8, 2) default 0,
  setup_hours numeric(8, 2) default 0,
  fixed_costs numeric(12, 2) default 0,
  target_event_margin numeric(5, 2) default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

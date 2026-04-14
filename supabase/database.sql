begin;

--
-- ARCHIVO CANONICO UNICO DE BASE DE DATOS
--
-- Este es el esquema final recomendado para el sistema.
--
-- Principios:
-- 1. id = PK numerica interna generada por el sistema.
-- 2. *_code / external_* = claves de negocio visibles o importadas.
-- 3. Todas las relaciones usan bigint.
--
-- Flujo sugerido:
-- 1. Ejecutar este script en una base nueva.
-- 2. Migrar la aplicacion para usar este esquema.
-- 3. Insertar catalogos iniciales y usuario administrador.
--

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.audit_table_change()
returns trigger
language plpgsql
as $$
declare
  actor_auth_user_id uuid;
  actor_app_user_id bigint;
  actor_email text;
  jwt_claims jsonb;
  request_headers jsonb;
  header_actor_auth_user_id uuid;
  header_actor_app_user_id bigint;
  header_actor_email text;
  header_actor_user_code text;
  header_actor_login_id text;
  record_id text;
begin
  begin
    actor_auth_user_id := auth.uid();
  exception
    when others then
      actor_auth_user_id := null;
  end;

  begin
    jwt_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception
    when others then
      jwt_claims := null;
  end;

  begin
    request_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception
    when others then
      request_headers := null;
  end;

  begin
    header_actor_auth_user_id := nullif(request_headers ->> 'x-app-auth-user-id', '')::uuid;
  exception
    when others then
      header_actor_auth_user_id := null;
  end;

  begin
    header_actor_app_user_id := nullif(request_headers ->> 'x-app-user-id', '')::bigint;
  exception
    when others then
      header_actor_app_user_id := null;
  end;

  header_actor_email := nullif(request_headers ->> 'x-app-user-email', '');
  header_actor_user_code := nullif(request_headers ->> 'x-app-user-code', '');
  header_actor_login_id := nullif(request_headers ->> 'x-app-user-login-id', '');

  actor_email := coalesce(
    header_actor_email,
    jwt_claims ->> 'email',
    nullif(current_setting('request.jwt.claim.email', true), ''),
    session_user
  );

  actor_auth_user_id := coalesce(actor_auth_user_id, header_actor_auth_user_id);
  actor_app_user_id := coalesce(actor_app_user_id, header_actor_app_user_id);

  if actor_app_user_id is null and (
    header_actor_user_code is not null
    or header_actor_login_id is not null
    or header_actor_email is not null
  ) then
    select
      u.id,
      u.auth_user_id,
      coalesce(header_actor_email, u.email)
    into
      actor_app_user_id,
      actor_auth_user_id,
      actor_email
    from public.app_users u
    where (header_actor_user_code is not null and u.user_code = header_actor_user_code)
       or (header_actor_login_id is not null and u.login_id = header_actor_login_id)
       or (header_actor_email is not null and lower(u.email) = lower(header_actor_email))
    order by u.id
    limit 1;
  end if;

  if actor_auth_user_id is not null then
    select u.id, coalesce(actor_email, u.email)
    into actor_app_user_id, actor_email
    from public.app_users u
    where u.auth_user_id = actor_auth_user_id
    limit 1;
  end if;

  if actor_auth_user_id is null and actor_app_user_id is not null then
    select u.auth_user_id, coalesce(actor_email, u.email)
    into actor_auth_user_id, actor_email
    from public.app_users u
    where u.id = actor_app_user_id
    limit 1;
  end if;

  if tg_op = 'DELETE' then
    record_id := coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'user_id');

    insert into public.system_change_log (
      schema_name,
      table_name,
      operation,
      record_id,
      changed_by_auth_user_id,
      changed_by_app_user_id,
      changed_by_email,
      old_data,
      new_data
    )
    values (
      tg_table_schema,
      tg_table_name,
      lower(tg_op),
      record_id,
      actor_auth_user_id,
      actor_app_user_id,
      actor_email,
      to_jsonb(old),
      null
    );

    return old;
  end if;

  record_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'user_id', to_jsonb(old) ->> 'id');

  insert into public.system_change_log (
    schema_name,
    table_name,
    operation,
    record_id,
    changed_by_auth_user_id,
    changed_by_app_user_id,
    changed_by_email,
    old_data,
    new_data
  )
  values (
    tg_table_schema,
    tg_table_name,
    lower(tg_op),
    record_id,
    actor_auth_user_id,
    actor_app_user_id,
    actor_email,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );

  return new;
end;
$$;

--
-- ESQUEMA OBJETIVO
--
-- Regla de diseño:
-- 1. id = PK interna numerica, consecutiva y sin significado de negocio.
-- 2. code / external_* = clave funcional, visible o importada.
-- 3. Todas las relaciones usan bigint.
--

create table if not exists public.app_roles (
  id bigint generated always as identity primary key,
  role_code text not null unique,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.role_module_permissions (
  id bigint generated always as identity primary key,
  role_id bigint not null references public.app_roles(id) on delete cascade,
  module_code text not null,
  module_name text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_import boolean not null default false,
  can_export boolean not null default false,
  can_print boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_role_module_permissions unique (role_id, module_code)
);

create table if not exists public.owners (
  id bigint generated always as identity primary key,
  owner_code text unique,
  name text not null,
  nit text not null unique,
  city text not null,
  address text not null,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customers (
  id bigint generated always as identity primary key,
  owner_id bigint not null references public.owners(id) on delete restrict,
  customer_code text unique,
  name text not null,
  nit text not null unique,
  city text not null,
  address text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stores (
  id bigint generated always as identity primary key,
  owner_id bigint not null references public.owners(id) on delete restrict,
  customer_id bigint not null references public.customers(id) on delete restrict,
  store_code text not null unique,
  name text not null,
  city text not null,
  address text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.materials (
  id bigint generated always as identity primary key,
  owner_id bigint references public.owners(id) on delete set null,
  customer_id bigint references public.customers(id) on delete set null,
  material_code text not null unique,
  description text not null,
  optional_code text,
  product_type text,
  is_conditioned boolean not null default false,
  is_active boolean not null default true,
  embalaje numeric(14,2),
  primary_unit text,
  secondary_unit text,
  barcode13 text,
  barcode14 text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.material_uoms (
  id bigint generated always as identity primary key,
  material_id bigint not null references public.materials(id) on delete cascade,
  unit text not null,
  ean_type text,
  ean_value text,
  numerator numeric(14,4) not null default 1,
  denominator numeric(14,4) not null default 1,
  height numeric(14,4) not null default 0,
  width numeric(14,4) not null default 0,
  length numeric(14,4) not null default 0,
  weight numeric(14,4) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_material_uoms unique (material_id, unit)
);

create table if not exists public.mapping_profiles (
  id bigint generated always as identity primary key,
  profile_code text unique,
  name text not null unique,
  is_active boolean not null default true,
  field_pedido text not null,
  field_nit text not null,
  field_sku text not null,
  field_cantidad text not null,
  field_orden text not null,
  field_lote text not null,
  field_vencimiento text not null,
  field_fabricacion text not null,
  field_codigo_tienda text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_users (
  id bigint generated always as identity primary key,
  user_code text unique,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  role_id bigint not null references public.app_roles(id) on delete restrict,
  name text not null,
  email text not null unique,
  avatar_url text,
  password_hash text,
  document_type text,
  document_number text not null unique,
  login_id text not null unique,
  phone text,
  otp_method text not null default 'email' check (otp_method in ('email', 'sms')),
  is_active boolean not null default true,
  is_first_login boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_messages (
  id bigint generated always as identity primary key,
  message_code text unique,
  created_by_user_id bigint references public.app_users(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  cc_emails text[] not null default '{}',
  bcc_emails text[] not null default '{}',
  subject text not null,
  body_text text,
  body_html text,
  status text not null default 'pending' check (status in ('pending', 'queued', 'sent', 'failed', 'cancelled')),
  provider text,
  provider_message_id text,
  related_entity_type text,
  related_entity_id bigint,
  sent_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_owner_access (
  user_id bigint not null references public.app_users(id) on delete cascade,
  owner_id bigint not null references public.owners(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, owner_id)
);

create table if not exists public.certification_processes (
  id bigint generated always as identity primary key,
  process_code text not null unique,
  owner_id bigint not null references public.owners(id) on delete restrict,
  created_by_user_id bigint references public.app_users(id) on delete set null,
  name text not null,
  process_type text not null,
  certification_date date not null,
  notes text not null default '',
  has_balances boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'in-progress', 'completed')),
  progress numeric(6,2) not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.process_orders (
  id bigint generated always as identity primary key,
  process_id bigint not null references public.certification_processes(id) on delete cascade,
  owner_id bigint references public.owners(id) on delete set null,
  customer_id bigint references public.customers(id) on delete set null,
  store_id bigint references public.stores(id) on delete set null,
  external_order_id text not null,
  order_number text not null,
  customer_name text not null,
  nit text not null,
  store_name text not null,
  store_code text not null,
  total_quantity numeric(14,2) not null default 0,
  total_boxes integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'verified', 'partial', 'cancelled')),
  is_finalized boolean not null default false,
  finalized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_process_orders unique (process_id, external_order_id)
);

create table if not exists public.order_assignments (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.process_orders(id) on delete cascade,
  user_id bigint not null references public.app_users(id) on delete cascade,
  assigned_at timestamptz not null default timezone('utc', now()),
  constraint uq_order_assignments unique (order_id, user_id)
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.process_orders(id) on delete cascade,
  material_id bigint references public.materials(id) on delete set null,
  product_code text not null,
  description text not null,
  batch text not null,
  expiry_date text,
  production_date text,
  quantity numeric(14,2) not null default 0,
  verified_quantity numeric(14,2) not null default 0,
  boxes integer not null default 0,
  box_factor numeric(14,4),
  status text not null default 'pending' check (status in ('pending', 'verified', 'partial', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_boxes (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.process_orders(id) on delete cascade,
  box_number integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_order_boxes unique (order_id, box_number)
);

create table if not exists public.order_box_items (
  id bigint generated always as identity primary key,
  order_box_id bigint not null references public.order_boxes(id) on delete cascade,
  material_id bigint references public.materials(id) on delete set null,
  product_code text not null,
  description text not null,
  quantity numeric(14,2) not null default 0,
  batch text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.system_change_log (
  id bigint generated always as identity primary key,
  schema_name text not null,
  table_name text not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  record_id text,
  changed_by_auth_user_id uuid references auth.users(id) on delete set null,
  changed_by_app_user_id bigint references public.app_users(id) on delete set null,
  changed_by_email text,
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_owners_owner_code on public.owners(owner_code);
create index if not exists idx_customers_owner_id on public.customers(owner_id);
create index if not exists idx_stores_owner_id on public.stores(owner_id);
create index if not exists idx_stores_customer_id on public.stores(customer_id);
create index if not exists idx_materials_owner_id on public.materials(owner_id);
create index if not exists idx_materials_customer_id on public.materials(customer_id);
create index if not exists idx_app_users_role_id on public.app_users(role_id);
create index if not exists idx_email_messages_created_by_user_id on public.email_messages(created_by_user_id);
create index if not exists idx_email_messages_recipient_email on public.email_messages(recipient_email);
create index if not exists idx_email_messages_status on public.email_messages(status);
create index if not exists idx_user_owner_access_owner_id on public.user_owner_access(owner_id);
create index if not exists idx_certification_processes_owner_id on public.certification_processes(owner_id);
create index if not exists idx_process_orders_process_id on public.process_orders(process_id);
create index if not exists idx_process_orders_owner_id on public.process_orders(owner_id);
create index if not exists idx_order_assignments_user_id on public.order_assignments(user_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_boxes_order_id on public.order_boxes(order_id);
create index if not exists idx_order_box_items_order_box_id on public.order_box_items(order_box_id);
create index if not exists idx_system_change_log_table_name on public.system_change_log(table_name);
create index if not exists idx_system_change_log_changed_at on public.system_change_log(changed_at desc);
create index if not exists idx_system_change_log_changed_by_app_user_id on public.system_change_log(changed_by_app_user_id);

create or replace view public.dispatch_ready_orders as
select
  o.id,
  o.external_order_id,
  o.order_number,
  o.process_id,
  p.process_code,
  p.name as process_name,
  o.owner_id,
  o.customer_id,
  o.store_id,
  o.customer_name,
  o.nit,
  o.store_name,
  o.store_code,
  o.total_quantity,
  o.total_boxes,
  o.status,
  o.is_finalized,
  o.finalized_at
from public.process_orders o
join public.certification_processes p on p.id = o.process_id
where o.is_finalized = true
  and o.status in ('verified', 'partial');

drop trigger if exists trg_app_roles_updated_at on public.app_roles;
create trigger trg_app_roles_updated_at before update on public.app_roles for each row execute function public.set_updated_at();

drop trigger if exists trg_role_module_permissions_updated_at on public.role_module_permissions;
create trigger trg_role_module_permissions_updated_at before update on public.role_module_permissions for each row execute function public.set_updated_at();

drop trigger if exists trg_owners_updated_at on public.owners;
create trigger trg_owners_updated_at before update on public.owners for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();

drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at before update on public.stores for each row execute function public.set_updated_at();

drop trigger if exists trg_materials_updated_at on public.materials;
create trigger trg_materials_updated_at before update on public.materials for each row execute function public.set_updated_at();

drop trigger if exists trg_material_uoms_updated_at on public.material_uoms;
create trigger trg_material_uoms_updated_at before update on public.material_uoms for each row execute function public.set_updated_at();

drop trigger if exists trg_mapping_profiles_updated_at on public.mapping_profiles;
create trigger trg_mapping_profiles_updated_at before update on public.mapping_profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at before update on public.app_users for each row execute function public.set_updated_at();

drop trigger if exists trg_email_messages_updated_at on public.email_messages;
create trigger trg_email_messages_updated_at before update on public.email_messages for each row execute function public.set_updated_at();

drop trigger if exists trg_certification_processes_updated_at on public.certification_processes;
create trigger trg_certification_processes_updated_at before update on public.certification_processes for each row execute function public.set_updated_at();

drop trigger if exists trg_process_orders_updated_at on public.process_orders;
create trigger trg_process_orders_updated_at before update on public.process_orders for each row execute function public.set_updated_at();

drop trigger if exists trg_order_items_updated_at on public.order_items;
create trigger trg_order_items_updated_at before update on public.order_items for each row execute function public.set_updated_at();

drop trigger if exists trg_order_boxes_updated_at on public.order_boxes;
create trigger trg_order_boxes_updated_at before update on public.order_boxes for each row execute function public.set_updated_at();

drop trigger if exists trg_order_box_items_updated_at on public.order_box_items;
create trigger trg_order_box_items_updated_at before update on public.order_box_items for each row execute function public.set_updated_at();

drop trigger if exists trg_app_roles_audit on public.app_roles;
create trigger trg_app_roles_audit after insert or update or delete on public.app_roles for each row execute function public.audit_table_change();

drop trigger if exists trg_role_module_permissions_audit on public.role_module_permissions;
create trigger trg_role_module_permissions_audit after insert or update or delete on public.role_module_permissions for each row execute function public.audit_table_change();

drop trigger if exists trg_owners_audit on public.owners;
create trigger trg_owners_audit after insert or update or delete on public.owners for each row execute function public.audit_table_change();

drop trigger if exists trg_customers_audit on public.customers;
create trigger trg_customers_audit after insert or update or delete on public.customers for each row execute function public.audit_table_change();

drop trigger if exists trg_stores_audit on public.stores;
create trigger trg_stores_audit after insert or update or delete on public.stores for each row execute function public.audit_table_change();

drop trigger if exists trg_materials_audit on public.materials;
create trigger trg_materials_audit after insert or update or delete on public.materials for each row execute function public.audit_table_change();

drop trigger if exists trg_material_uoms_audit on public.material_uoms;
create trigger trg_material_uoms_audit after insert or update or delete on public.material_uoms for each row execute function public.audit_table_change();

drop trigger if exists trg_mapping_profiles_audit on public.mapping_profiles;
create trigger trg_mapping_profiles_audit after insert or update or delete on public.mapping_profiles for each row execute function public.audit_table_change();

drop trigger if exists trg_app_users_audit on public.app_users;
create trigger trg_app_users_audit after insert or update or delete on public.app_users for each row execute function public.audit_table_change();

drop trigger if exists trg_email_messages_audit on public.email_messages;
create trigger trg_email_messages_audit after insert or update or delete on public.email_messages for each row execute function public.audit_table_change();

drop trigger if exists trg_user_owner_access_audit on public.user_owner_access;
create trigger trg_user_owner_access_audit after insert or update or delete on public.user_owner_access for each row execute function public.audit_table_change();

drop trigger if exists trg_certification_processes_audit on public.certification_processes;
create trigger trg_certification_processes_audit after insert or update or delete on public.certification_processes for each row execute function public.audit_table_change();

drop trigger if exists trg_process_orders_audit on public.process_orders;
create trigger trg_process_orders_audit after insert or update or delete on public.process_orders for each row execute function public.audit_table_change();

drop trigger if exists trg_order_assignments_audit on public.order_assignments;
create trigger trg_order_assignments_audit after insert or update or delete on public.order_assignments for each row execute function public.audit_table_change();

drop trigger if exists trg_order_items_audit on public.order_items;
create trigger trg_order_items_audit after insert or update or delete on public.order_items for each row execute function public.audit_table_change();

drop trigger if exists trg_order_boxes_audit on public.order_boxes;
create trigger trg_order_boxes_audit after insert or update or delete on public.order_boxes for each row execute function public.audit_table_change();

drop trigger if exists trg_order_box_items_audit on public.order_box_items;
create trigger trg_order_box_items_audit after insert or update or delete on public.order_box_items for each row execute function public.audit_table_change();

insert into public.app_roles (role_code, name, description, is_active)
values
  ('admin', 'Administrador', 'Acceso total a todos los modulos del sistema.', true),
  ('certificador', 'Certificador', 'Personal operativo para certificacion en bodega.', true)
on conflict (role_code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

insert into public.role_module_permissions (
  role_id,
  module_code,
  module_name,
  can_view,
  can_create,
  can_edit,
  can_delete,
  can_import,
  can_export,
  can_print
)
select
  r.id,
  seed.module_code,
  seed.module_name,
  seed.can_view,
  seed.can_create,
  seed.can_edit,
  seed.can_delete,
  seed.can_import,
  seed.can_export,
  seed.can_print
from (
  values
    ('admin', 'dashboard', 'Dashboard', true, false, false, false, false, false, false),
    ('admin', 'orders', 'Pedidos Maestro', true, true, true, true, true, true, false),
    ('admin', 'tasks', 'Mis Tareas', true, true, true, true, false, false, false),
    ('admin', 'referrals', 'Remisiones', true, true, true, true, false, true, true),
    ('admin', 'owners', 'Propietarios', true, true, true, true, false, false, false),
    ('admin', 'mapping', 'Homologacion', true, true, true, true, false, false, false),
    ('admin', 'directory', 'Directorio Maestro', true, true, true, true, true, false, false),
    ('admin', 'materials', 'Catalogo Materiales', true, true, true, true, true, false, false),
    ('admin', 'users', 'Usuarios', true, true, true, true, false, false, false),
    ('admin', 'roles', 'Roles y Permisos', true, true, true, true, false, false, false),
    ('certificador', 'dashboard', 'Dashboard', true, false, false, false, false, false, false),
    ('certificador', 'tasks', 'Mis Tareas', true, false, true, false, false, false, false),
    ('certificador', 'referrals', 'Remisiones', true, false, false, false, false, false, false)
) as seed(role_code, module_code, module_name, can_view, can_create, can_edit, can_delete, can_import, can_export, can_print)
join public.app_roles r on r.role_code = seed.role_code
on conflict (role_id, module_code) do update
set
  module_name = excluded.module_name,
  can_view = excluded.can_view,
  can_create = excluded.can_create,
  can_edit = excluded.can_edit,
  can_delete = excluded.can_delete,
  can_import = excluded.can_import,
  can_export = excluded.can_export,
  can_print = excluded.can_print,
  updated_at = timezone('utc', now());

commit;
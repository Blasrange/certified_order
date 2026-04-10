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

-- Extensión para funciones criptográficas
create extension if not exists pgcrypto;

-- Función para actualizar automáticamente el campo updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
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

-- =====================================================
-- TABLA: app_roles (Roles de la aplicación)
-- =====================================================
-- Almacena los roles disponibles en el sistema
create table if not exists public.app_roles (
  id bigint generated always as identity primary key,           -- Identificador único interno
  role_code text not null unique,                               -- Código del rol (clave de negocio)
  name text not null,                                           -- Nombre del rol
  description text not null default '',                         -- Descripción del rol
  is_active boolean not null default true,                      -- Estado activo/inactivo
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: role_module_permissions (Permisos por módulo y rol)
-- =====================================================
-- Define los permisos específicos que cada rol tiene sobre los módulos
create table if not exists public.role_module_permissions (
  id bigint generated always as identity primary key,           -- Identificador único interno
  role_id bigint not null references public.app_roles(id) on delete cascade, -- ID del rol
  module_code text not null,                                    -- Código del módulo
  module_name text not null,                                    -- Nombre del módulo
  can_view boolean not null default false,                      -- Permiso para visualizar
  can_create boolean not null default false,                    -- Permiso para crear
  can_edit boolean not null default false,                      -- Permiso para editar
  can_delete boolean not null default false,                    -- Permiso para eliminar
  can_import boolean not null default false,                    -- Permiso para importar
  can_export boolean not null default false,                    -- Permiso para exportar
  can_print boolean not null default false,                     -- Permiso para imprimir
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now()), -- Fecha de última modificación
  constraint uq_role_module_permissions unique (role_id, module_code) -- Unicidad por rol y módulo
);

-- =====================================================
-- TABLA: owners (Propietarios/Empresas)
-- =====================================================
-- Almacena los propietarios o empresas que utilizan el sistema
create table if not exists public.owners (
  id bigint generated always as identity primary key,           -- Identificador único interno
  owner_code text unique,                                       -- Código del propietario
  name text not null,                                           -- Nombre o razón social
  nit text not null unique,                                     -- Número de identificación tributaria
  city text not null,                                           -- Ciudad
  address text not null,                                        -- Dirección
  phone text,                                                   -- Teléfono
  email text,                                                   -- Correo electrónico
  is_active boolean not null default true,                      -- Estado activo/inactivo
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: customers (Clientes)
-- =====================================================
-- Almacena los clientes asociados a los propietarios
create table if not exists public.customers (
  id bigint generated always as identity primary key,           -- Identificador único interno
  owner_id bigint not null references public.owners(id) on delete restrict, -- ID del propietario
  customer_code text unique,                                    -- Código del cliente
  name text not null,                                           -- Nombre o razón social
  nit text not null unique,                                     -- Número de identificación tributaria
  city text not null,                                           -- Ciudad
  address text not null,                                        -- Dirección
  phone text,                                                   -- Teléfono
  is_active boolean not null default true,                      -- Estado activo/inactivo
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: stores (Tiendas/Puntos de venta)
-- =====================================================
-- Almacena las tiendas o puntos de venta de los clientes
create table if not exists public.stores (
  id bigint generated always as identity primary key,           -- Identificador único interno
  owner_id bigint not null references public.owners(id) on delete restrict, -- ID del propietario
  customer_id bigint not null references public.customers(id) on delete restrict, -- ID del cliente
  store_code text not null unique,                              -- Código de tienda
  name text not null,                                           -- Nombre de la tienda
  city text not null,                                           -- Ciudad
  address text not null,                                        -- Dirección
  phone text,                                                   -- Teléfono
  is_active boolean not null default true,                      -- Estado activo/inactivo
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: materials (Materiales/Productos)
-- =====================================================
-- Catálogo de materiales o productos
create table if not exists public.materials (
  id bigint generated always as identity primary key,           -- Identificador único interno
  owner_id bigint references public.owners(id) on delete set null, -- ID del propietario (opcional)
  --customer_id bigint references public.customers(id) on delete set null, -- ID del cliente (opcional)
  material_code text not null unique,                           -- Código del material
  description text not null,                                    -- Descripción del material
  --optional_code text,                                           -- Código opcional alternativo
  product_type text,                                            -- Tipo de producto
  is_conditioned boolean not null default false,                -- Indica si está acondicionado
  is_active boolean not null default true,                      -- Estado activo/inactivo
  embalaje numeric(14,2),                                       -- Tipo de embalaje
  primary_unit text,                                            -- Unidad primaria de medida
  secondary_unit text,                                          -- Unidad secundaria de medida
  barcode13 text,                                               -- Código de barras de 13 dígitos
  barcode14 text,                                               -- Código de barras de 14 dígitos
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: material_uoms (Unidades de medida de materiales)
-- =====================================================
-- Unidades de medida y factores de conversión para cada material
create table if not exists public.material_uoms (
  id bigint generated always as identity primary key,           -- Identificador único interno
  material_id bigint not null references public.materials(id) on delete cascade, -- ID del material
  unit text not null,                                           -- Unidad de medida
  ean_type text,                                                -- Tipo de código EAN
  ean_value text,                                               -- Valor del código EAN
  numerator numeric(14,4) not null default 1,                   -- Numerador del factor de conversión
  denominator numeric(14,4) not null default 1,                 -- Denominador del factor de conversión
  height numeric(14,4) not null default 0,                      -- Altura
  width numeric(14,4) not null default 0,                       -- Ancho
  length numeric(14,4) not null default 0,                      -- Largo
  weight numeric(14,4) not null default 0,                      -- Peso
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now()), -- Fecha de última modificación
  constraint uq_material_uoms unique (material_id, unit)        -- Unicidad por material y unidad
);

-- =====================================================
-- TABLA: mapping_profiles (Perfiles de homologación)
-- =====================================================
-- Define los perfiles para mapear campos en importaciones de archivos
create table if not exists public.mapping_profiles (
  id bigint generated always as identity primary key,           -- Identificador único interno
  profile_code text unique,                                     -- Código del perfil
  name text not null unique,                                    -- Nombre del perfil
  is_active boolean not null default true,                      -- Estado activo/inactivo
  field_pedido text not null,                                   -- Campo para número de pedido
  field_nit text not null,                                      -- Campo para NIT
  field_sku text not null,                                      -- Campo para SKU
  field_cantidad text not null,                                 -- Campo para cantidad
  field_orden text not null,                                    -- Campo para orden
  field_lote text not null,                                     -- Campo para lote
  field_vencimiento text not null,                              -- Campo para fecha de vencimiento
  field_fabricacion text not null,                              -- Campo para fecha de fabricación
  field_codigo_tienda text not null,                            -- Campo para código de tienda
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: app_users (Usuarios del sistema)
-- =====================================================
-- Almacena los usuarios que pueden acceder al sistema
create table if not exists public.app_users (
  id bigint generated always as identity primary key,           -- Identificador único interno
  user_code text unique,                                        -- Código de usuario
  auth_user_id uuid unique references auth.users(id) on delete set null, -- ID del usuario en autenticación
  role_id bigint not null references public.app_roles(id) on delete restrict, -- ID del rol
  name text not null,                                           -- Nombre completo
  email text not null unique,                                   -- Correo electrónico
  avatar_url text,                                              -- URL del avatar
  password_hash text,                                           -- Hash de la contraseña
  document_type text,                                           -- Tipo de documento (CC, NIT, etc)
  document_number text not null unique,                         -- Número de documento
  login_id text not null unique,                                -- ID de inicio de sesión
  phone text,                                                   -- Teléfono
  otp_method text not null default 'email' check (otp_method in ('email', 'sms')), -- Método de autenticación 2FA
  is_active boolean not null default true,                      -- Estado activo/inactivo
  is_first_login boolean not null default true,                 -- Indica si es el primer inicio de sesión
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: user_owner_access (Acceso de usuarios a propietarios)
-- =====================================================
-- Relación muchos a muchos entre usuarios y propietarios
create table if not exists public.user_owner_access (
  user_id bigint not null references public.app_users(id) on delete cascade, -- ID del usuario
  owner_id bigint not null references public.owners(id) on delete cascade, -- ID del propietario
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  primary key (user_id, owner_id)                               -- Clave primaria compuesta
);

-- =====================================================
-- TABLA: certification_processes (Procesos de certificación)
-- =====================================================
-- Representa los procesos de certificación creados
create table if not exists public.certification_processes (
  id bigint generated always as identity primary key,           -- Identificador único interno
  process_code text not null unique,                            -- Código del proceso
  owner_id bigint not null references public.owners(id) on delete restrict, -- ID del propietario
  created_by_user_id bigint references public.app_users(id) on delete set null, -- Usuario que creó el proceso
  name text not null,                                           -- Nombre del proceso
  process_type text not null,                                   -- Tipo de proceso
  certification_date date not null,                             -- Fecha de certificación
  notes text not null default '',                               -- Notas adicionales
  has_balances boolean not null default false,                  -- Indica si tiene saldos pendientes
  status text not null default 'pending' check (status in ('pending', 'in-progress', 'completed')), -- Estado del proceso
  progress numeric(6,2) not null default 0 check (progress >= 0 and progress <= 100), -- Porcentaje de progreso
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: process_orders (Órdenes dentro del proceso)
-- =====================================================
-- Almacena las órdenes asociadas a un proceso de certificación
create table if not exists public.process_orders (
  id bigint generated always as identity primary key,           -- Identificador único interno
  process_id bigint not null references public.certification_processes(id) on delete cascade, -- ID del proceso
  owner_id bigint references public.owners(id) on delete set null, -- ID del propietario
  customer_id bigint references public.customers(id) on delete set null, -- ID del cliente
  store_id bigint references public.stores(id) on delete set null, -- ID de la tienda
  external_order_id text not null,                              -- ID externo del pedido
  order_number text not null,                                   -- Número de orden
  customer_name text not null,                                  -- Nombre del cliente
  nit text not null,                                            -- NIT del cliente
  store_name text not null,                                     -- Nombre de la tienda
  store_code text not null,                                     -- Código de la tienda
  total_quantity numeric(14,2) not null default 0,              -- Cantidad total de productos
  total_boxes integer not null default 0,                       -- Total de cajas
  status text not null default 'pending' check (status in ('pending', 'verified', 'partial', 'cancelled')), -- Estado de la orden
  is_finalized boolean not null default false,                  -- Indica si está finalizada
  finalized_at timestamptz,                                     -- Fecha de finalización
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now()), -- Fecha de última modificación
  constraint uq_process_orders unique (process_id, external_order_id) -- Unicidad por proceso y ID externo
);

-- =====================================================
-- TABLA: order_assignments (Asignaciones de órdenes)
-- =====================================================
-- Asigna usuarios a órdenes específicas para su gestión
create table if not exists public.order_assignments (
  id bigint generated always as identity primary key,           -- Identificador único interno
  order_id bigint not null references public.process_orders(id) on delete cascade, -- ID de la orden
  user_id bigint not null references public.app_users(id) on delete cascade, -- ID del usuario asignado
  assigned_at timestamptz not null default timezone('utc', now()), -- Fecha de asignación
  constraint uq_order_assignments unique (order_id, user_id)    -- Unicidad por orden y usuario
);

-- =====================================================
-- TABLA: order_items (Items de las órdenes)
-- =====================================================
-- Detalle de los productos incluidos en cada orden
create table if not exists public.order_items (
  id bigint generated always as identity primary key,           -- Identificador único interno
  order_id bigint not null references public.process_orders(id) on delete cascade, -- ID de la orden
  material_id bigint references public.materials(id) on delete set null, -- ID del material/producto
  product_code text not null,                                   -- Código del producto
  description text not null,                                    -- Descripción del producto
  batch text not null,                                          -- Lote del producto
  expiry_date text,                                             -- Fecha de vencimiento
  production_date text,                                         -- Fecha de fabricación
  quantity numeric(14,2) not null default 0,                    -- Cantidad del producto
  verified_quantity numeric(14,2) not null default 0,           -- Cantidad verificada
  boxes integer not null default 0,                             -- Número de cajas
  box_factor numeric(14,4),                                     -- Factor de conversión por caja
  status text not null default 'pending' check (status in ('pending', 'verified', 'partial', 'cancelled')), -- Estado del item
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- TABLA: order_boxes (Cajas de las órdenes)
-- =====================================================
-- Registra las cajas físicas asociadas a una orden
create table if not exists public.order_boxes (
  id bigint generated always as identity primary key,           -- Identificador único interno
  order_id bigint not null references public.process_orders(id) on delete cascade, -- ID de la orden
  box_number integer not null,                                  -- Número de caja
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now()), -- Fecha de última modificación
  constraint uq_order_boxes unique (order_id, box_number)       -- Unicidad por orden y número de caja
);

-- =====================================================
-- TABLA: order_box_items (Items dentro de las cajas)
-- =====================================================
-- Detalle de los productos contenidos en cada caja
create table if not exists public.order_box_items (
  id bigint generated always as identity primary key,           -- Identificador único interno
  order_box_id bigint not null references public.order_boxes(id) on delete cascade, -- ID de la caja
  material_id bigint references public.materials(id) on delete set null, -- ID del material/producto
  product_code text not null,                                   -- Código del producto
  description text not null,                                    -- Descripción del producto
  quantity numeric(14,2) not null default 0,                    -- Cantidad del producto
  batch text,                                                   -- Lote del producto
  created_at timestamptz not null default timezone('utc', now()), -- Fecha de creación
  updated_at timestamptz not null default timezone('utc', now())  -- Fecha de última modificación
);

-- =====================================================
-- ÍNDICES PARA MEJORAR EL RENDIMIENTO
-- =====================================================

-- Índices para la tabla owners
create index if not exists idx_owners_owner_code on public.owners(owner_code);

-- Índices para la tabla customers
create index if not exists idx_customers_owner_id on public.customers(owner_id);

-- Índices para la tabla stores
create index if not exists idx_stores_owner_id on public.stores(owner_id);
create index if not exists idx_stores_customer_id on public.stores(customer_id);

-- Índices para la tabla materials
create index if not exists idx_materials_owner_id on public.materials(owner_id);
create index if not exists idx_materials_customer_id on public.materials(customer_id);

-- Índices para la tabla app_users
create index if not exists idx_app_users_role_id on public.app_users(role_id);

-- Índices para la tabla user_owner_access
create index if not exists idx_user_owner_access_owner_id on public.user_owner_access(owner_id);

-- Índices para la tabla certification_processes
create index if not exists idx_certification_processes_owner_id on public.certification_processes(owner_id);

-- Índices para la tabla process_orders
create index if not exists idx_process_orders_process_id on public.process_orders(process_id);
create index if not exists idx_process_orders_owner_id on public.process_orders(owner_id);

-- Índices para la tabla order_assignments
create index if not exists idx_order_assignments_user_id on public.order_assignments(user_id);

-- Índices para la tabla order_items
create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- Índices para la tabla order_boxes
create index if not exists idx_order_boxes_order_id on public.order_boxes(order_id);

-- Índices para la tabla order_box_items
create index if not exists idx_order_box_items_order_box_id on public.order_box_items(order_box_id);

-- =====================================================
-- VISTA: dispatch_ready_orders (Órdenes listas para despacho)
-- =====================================================
-- Vista que muestra las órdenes finalizadas y listas para ser despachadas
create or replace view public.dispatch_ready_orders as
select
  o.id,                          -- ID de la orden
  o.external_order_id,           -- ID externo del pedido
  o.order_number,                -- Número de orden
  o.process_id,                  -- ID del proceso
  p.process_code,                -- Código del proceso
  p.name as process_name,        -- Nombre del proceso
  o.owner_id,                    -- ID del propietario
  o.customer_id,                 -- ID del cliente
  o.store_id,                    -- ID de la tienda
  o.customer_name,               -- Nombre del cliente
  o.nit,                         -- NIT del cliente
  o.store_name,                  -- Nombre de la tienda
  o.store_code,                  -- Código de la tienda
  o.total_quantity,              -- Cantidad total
  o.total_boxes,                 -- Total de cajas
  o.status,                      -- Estado de la orden
  o.is_finalized,                -- Indicador de finalización
  o.finalized_at                 -- Fecha de finalización
from public.process_orders o
join public.certification_processes p on p.id = o.process_id
where o.is_finalized = true
  and o.status in ('verified', 'partial'); -- Solo órdenes verificadas o parciales

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- =====================================================

-- Trigger para app_roles
drop trigger if exists trg_app_roles_updated_at on public.app_roles;
create trigger trg_app_roles_updated_at before update on public.app_roles for each row execute function public.set_updated_at();

-- Trigger para role_module_permissions
drop trigger if exists trg_role_module_permissions_updated_at on public.role_module_permissions;
create trigger trg_role_module_permissions_updated_at before update on public.role_module_permissions for each row execute function public.set_updated_at();

-- Trigger para owners
drop trigger if exists trg_owners_updated_at on public.owners;
create trigger trg_owners_updated_at before update on public.owners for each row execute function public.set_updated_at();

-- Trigger para customers
drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();

-- Trigger para stores
drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at before update on public.stores for each row execute function public.set_updated_at();

-- Trigger para materials
drop trigger if exists trg_materials_updated_at on public.materials;
create trigger trg_materials_updated_at before update on public.materials for each row execute function public.set_updated_at();

-- Trigger para material_uoms
drop trigger if exists trg_material_uoms_updated_at on public.material_uoms;
create trigger trg_material_uoms_updated_at before update on public.material_uoms for each row execute function public.set_updated_at();

-- Trigger para mapping_profiles
drop trigger if exists trg_mapping_profiles_updated_at on public.mapping_profiles;
create trigger trg_mapping_profiles_updated_at before update on public.mapping_profiles for each row execute function public.set_updated_at();

-- Trigger para app_users
drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at before update on public.app_users for each row execute function public.set_updated_at();

-- Trigger para certification_processes
drop trigger if exists trg_certification_processes_updated_at on public.certification_processes;
create trigger trg_certification_processes_updated_at before update on public.certification_processes for each row execute function public.set_updated_at();

-- Trigger para process_orders
drop trigger if exists trg_process_orders_updated_at on public.process_orders;
create trigger trg_process_orders_updated_at before update on public.process_orders for each row execute function public.set_updated_at();

-- Trigger para order_items
drop trigger if exists trg_order_items_updated_at on public.order_items;
create trigger trg_order_items_updated_at before update on public.order_items for each row execute function public.set_updated_at();

-- Trigger para order_boxes
drop trigger if exists trg_order_boxes_updated_at on public.order_boxes;
create trigger trg_order_boxes_updated_at before update on public.order_boxes for each row execute function public.set_updated_at();

-- Trigger para order_box_items
drop trigger if exists trg_order_box_items_updated_at on public.order_box_items;
create trigger trg_order_box_items_updated_at before update on public.order_box_items for each row execute function public.set_updated_at();

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Inserción de roles básicos del sistema
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

-- Inserción de permisos para cada rol
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
    -- Permisos para rol Administrador
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
    -- Permisos para rol Certificador
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
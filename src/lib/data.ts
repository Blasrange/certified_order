
import type { Order, Customer, Store, Material, User, Owner, AppRole } from "./types";

/**
 * DATOS MAESTROS INICIALES - SISTEMA LIMPIO DE PRODUCCIÓN
 * Solo se conserva el administrador del sistema y los roles básicos.
 */

export const mockUsers: User[] = [
  { 
    id: 'USER-ADMIN', 
    name: 'Administrador del Sistema', 
    email: 'admin@orderflow.pro', 
    password: 'password123', 
    avatar: 'https://picsum.photos/seed/admin/150/150', 
    role: 'admin',
    documentType: 'Cédula de ciudadanía',
    documentNumber: '1000000001',
    loginId: 'CC1000000001',
    phone: '3000000000',
    otpMethod: 'email',
    isActive: true,
    isFirstLogin: false,
    ownerIds: [] 
  }
];

export const mockRoles: AppRole[] = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso total y absoluto a todos los módulos administrativos y operativos del sistema.',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: [
      { moduleId: 'dashboard', moduleName: 'Dashboard', permissions: { view: true, create: false, edit: false, delete: false } },
      { moduleId: 'orders', moduleName: 'Pedidos Maestro', permissions: { view: true, create: true, edit: true, delete: true, import: true, export: true } },
      { moduleId: 'tasks', moduleName: 'Mis Tareas', permissions: { view: true, create: true, edit: true, delete: true } },
      { moduleId: 'referrals', moduleName: 'Remisiones', permissions: { view: true, create: true, edit: true, delete: true, print: true, export: true } },
      { moduleId: 'owners', moduleName: 'Propietarios', permissions: { view: true, create: true, edit: true, delete: true } },
      { moduleId: 'mapping', moduleName: 'Homologación', permissions: { view: true, create: true, edit: true, delete: true } },
      { moduleId: 'directory', moduleName: 'Directorio Maestro', permissions: { view: true, create: true, edit: true, delete: true, import: true } },
      { moduleId: 'materials', moduleName: 'Catálogo Materiales', permissions: { view: true, create: true, edit: true, delete: true, import: true } },
      { moduleId: 'users', moduleName: 'Usuarios', permissions: { view: true, create: true, edit: true, delete: true } },
      { moduleId: 'roles', moduleName: 'Roles y Permisos', permissions: { view: true, create: true, edit: true, delete: true } },
    ]
  },
  {
    id: 'certificador',
    name: 'Certificador',
    description: 'Personal operativo con acceso limitado a la ejecución de tareas de certificación en bodega.',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: [
      { moduleId: 'dashboard', moduleName: 'Dashboard', permissions: { view: true, create: false, edit: false, delete: false } },
      { moduleId: 'tasks', moduleName: 'Mis Tareas', permissions: { view: true, create: false, edit: true, delete: false } },
      { moduleId: 'referrals', moduleName: 'Remisiones', permissions: { view: true, create: false, edit: false, delete: false, print: false, export: false } },
    ]
  }
];

// Listas maestras vacías para inicio de producción real
export const mockOwners: Owner[] = [];
export const mockCustomers: Customer[] = [];
export const mockStores: Store[] = [];
export const mockMaterials: Material[] = [];

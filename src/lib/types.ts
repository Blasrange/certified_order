export type Role = 'admin' | 'certificador' | 'logistica' | string;

export type Permission = {
  id: string;
  name: string;
  description: string;
};

export type ModulePermissions = {
  moduleId: string;
  moduleName: string;
  permissions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    import?: boolean;
    export?: boolean;
    print?: boolean;
  };
};

export type AppRole = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  permissions: ModulePermissions[];
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  password?: string;
  documentType?: string;
  documentNumber?: string;
  loginId?: string;
  phone?: string;
  otpMethod?: 'email' | 'sms';
  isActive: boolean;
  isFirstLogin?: boolean;
  ownerIds?: string[];
};

export type OrderItem = {
  productCode: string;
  description: string;
  batch: string;
  expiryDate: string; 
  productionDate: string;
  quantity: number;
  verifiedQuantity: number;
  boxes: number;
  boxFactor?: number;
  status: 'pending' | 'verified' | 'partial' | 'cancelled';
};

export type BoxItem = {
  productCode: string;
  description: string;
  quantity: number;
  batch?: string;
};

export type OrderBox = {
  boxNumber: number;
  items: BoxItem[];
};

export type OrderGroup = {
  id: string;
  orderNumber: string;
  customerName: string;
  nit: string;
  storeName: string;
  storeCode: string;
  totalQuantity: number;
  totalBoxes: number;
  status: 'pending' | 'verified' | 'partial' | 'cancelled';
  items: OrderItem[];
  boxes?: OrderBox[];
  assignedTo?: string[];
  isFinalized?: boolean;
  finalizedAt?: string;
  ownerId?: string;
};

export type GroupedOrder = {
  id: string;
  name: string;
  type: 'Nacional' | 'Exportación';
  certificationDate: string;
  ownerId?: string;
  notes: string;
  hasBalances: boolean;
  orders: OrderGroup[];
  status: 'pending' | 'in-progress' | 'completed';
  progress: number;
  creationDate: string;
  createdBy?: User;
};

export type Customer = {
  id: string;
  name: string;
  nit: string;
  city: string;
  address: string;
  phone?: string;
  isActive: boolean;
  ownerId?: string;
};

export type Store = {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone?: string;
  customerNit: string;
  isActive: boolean;
  ownerId?: string;
};

export type Owner = {
  id: string;
  name: string;
  nit: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  isActive: boolean;
};

export type UOM = {
  id: string;
  unit: string;
  eanType: string;
  eanValue: string;
  numerator: number;
  denominator: number;
  height: number;
  width: number;
  length: number;
  weight: number;
};

export type Material = {
  id: string;
  code: string;
  description: string;
  optionalCode?: string;
  productType?: string;
  customerNit?: string;
  ownerId?: string;
  isConditioned?: boolean;
  uoms: UOM[];
  isActive: boolean;
  embalaje?: number;
  primaryUnit?: string;
  secondaryUnit?: string;
  barcode13?: string;
  barcode14?: string;
};

export type MappingProfile = {
  id: string;
  name: string;
  isActive: boolean;
  fields: {
    pedido: string;
    nit: string;
    sku: string;
    cantidad: string;
    orden: string;
    lote: string;
    vencimiento: string;
    fabricacion: string;
    codigoTienda: string;
  }
};
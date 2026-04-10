import "server-only";

import type {
  AppRole,
  Customer,
  GroupedOrder,
  MappingProfile,
  Material,
  ModulePermissions,
  OrderBox,
  OrderGroup,
  OrderItem,
  Owner,
  Store,
  UOM,
  User,
} from "@/lib/types";
import type { AppBootstrapData } from "@/lib/app-data-types";
import { supabaseAdmin } from "@/lib/supabase/admin";

const assertNoError = (error: { message: string } | null, context: string) => {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
};

const pickBusinessOrInternalId = (businessId: unknown, internalId: unknown) =>
  businessId != null && businessId !== "" ? String(businessId) : String(internalId);

const buildFallbackMaterialUoms = (material: any): UOM[] => {
  const derivedUoms: UOM[] = [];

  if (material.primary_unit && material.barcode13) {
    derivedUoms.push({
      id: `derived-${material.id}-ean13`,
      unit: material.primary_unit,
      eanType: "EAN13",
      eanValue: material.barcode13,
      numerator: 1,
      denominator: 1,
      height: 0,
      width: 0,
      length: 0,
      weight: 0,
    });
  }

  if (material.secondary_unit && material.barcode14) {
    derivedUoms.push({
      id: `derived-${material.id}-ean14`,
      unit: material.secondary_unit,
      eanType: "EAN14",
      eanValue: material.barcode14,
      numerator: Number(material.embalaje || 1),
      denominator: 1,
      height: 0,
      width: 0,
      length: 0,
      weight: 0,
    });
  }

  return derivedUoms;
};

const buildMaterialUomPayloads = (material: Material): Array<Record<string, unknown>> => {
  const sourceUoms = material.uoms.length > 0
    ? material.uoms
    : [
        material.primaryUnit && material.barcode13
          ? {
              id: `${material.id}-ean13`,
              unit: material.primaryUnit,
              eanType: "EAN13",
              eanValue: material.barcode13,
              numerator: 1,
              denominator: 1,
              height: 0,
              width: 0,
              length: 0,
              weight: 0,
            }
          : null,
        material.secondaryUnit && material.barcode14
          ? {
              id: `${material.id}-ean14`,
              unit: material.secondaryUnit,
              eanType: "EAN14",
              eanValue: material.barcode14,
              numerator: material.embalaje || 1,
              denominator: 1,
              height: 0,
              width: 0,
              length: 0,
              weight: 0,
            }
          : null,
      ].filter(Boolean) as UOM[];

  const uniqueUoms = Array.from(
    new Map(
      sourceUoms
        .filter((uom) => String(uom.unit || "").trim() !== "")
        .map((uom) => [String(uom.unit).trim().toLowerCase(), uom])
    ).values()
  );

  return uniqueUoms.map((uom) => ({
    unit: uom.unit,
    ean_type: uom.eanType,
    ean_value: uom.eanValue,
    numerator: uom.numerator,
    denominator: uom.denominator,
    height: uom.height,
    width: uom.width,
    length: uom.length,
    weight: uom.weight,
  }));
};

const withInternalAndBusinessKeys = <T extends { id: unknown }>(
  rows: T[],
  getBusinessKey: (row: T) => unknown
) => {
  const map = new Map<string, T>();

  rows.forEach((row) => {
    map.set(String(row.id), row);

    const businessKey = getBusinessKey(row);
    if (businessKey != null && businessKey !== "") {
      map.set(String(businessKey), row);
    }
  });

  return map;
};

const toRole = (
  role: any,
  permissions: any[]
): AppRole => ({
  id: role.role_code || String(role.id),
  name: role.name,
  description: role.description,
  isActive: role.is_active,
  createdAt: role.created_at,
  permissions: permissions
    .filter((permission) => permission.role_id === role.id)
    .map(
      (permission): ModulePermissions => ({
        moduleId: permission.module_code,
        moduleName: permission.module_name,
        permissions: {
          view: permission.can_view,
          create: permission.can_create,
          edit: permission.can_edit,
          delete: permission.can_delete,
          import: permission.can_import,
          export: permission.can_export,
          print: permission.can_print,
        },
      })
    ),
});

const toUser = (
  user: any,
  accessRows: any[],
  roleCodeById: Map<string, string>,
  ownerCodeById: Map<string, string>
): User => ({
  id: user.user_code || String(user.id),
  name: user.name,
  email: user.email,
  avatar: user.avatar_url || "",
  role: roleCodeById.get(String(user.role_id)) || String(user.role_id),
  password: user.password_hash || undefined,
  documentType: user.document_type || undefined,
  documentNumber: user.document_number || undefined,
  loginId: user.login_id || undefined,
  phone: user.phone || undefined,
  otpMethod: user.otp_method || "email",
  isActive: user.is_active,
  isFirstLogin: user.is_first_login,
  ownerIds: accessRows
    .filter((access) => access.user_id === user.id)
    .map((access) => ownerCodeById.get(String(access.owner_id)) || String(access.owner_id)),
});

const toMaterial = (
  material: any,
  uoms: any[],
  customerNitById: Map<string, string>,
  ownerCodeById: Map<string, string>
) : Material => {
  const materialUoms = uoms
    .filter((uom) => uom.material_id === material.id)
    .map(
      (uom): UOM => ({
        id: String(uom.id),
        unit: uom.unit,
        eanType: uom.ean_type,
        eanValue: uom.ean_value,
        numerator: Number(uom.numerator || 0),
        denominator: Number(uom.denominator || 0),
        height: Number(uom.height || 0),
        width: Number(uom.width || 0),
        length: Number(uom.length || 0),
        weight: Number(uom.weight || 0),
      })
    );

  return {
  id: pickBusinessOrInternalId(material.material_code, material.id),
  code: material.material_code,
  description: material.description,
  optionalCode: material.optional_code || undefined,
  productType: material.product_type || undefined,
  customerNit: material.customer_id ? customerNitById.get(String(material.customer_id)) || undefined : undefined,
  ownerId: material.owner_id ? ownerCodeById.get(String(material.owner_id)) || String(material.owner_id) : undefined,
  isConditioned: material.is_conditioned,
  uoms: materialUoms.length > 0 ? materialUoms : buildFallbackMaterialUoms(material),
  isActive: material.is_active,
  embalaje: material.embalaje != null ? Number(material.embalaje) : undefined,
  primaryUnit: material.primary_unit || undefined,
  secondaryUnit: material.secondary_unit || undefined,
  barcode13: material.barcode13 || undefined,
  barcode14: material.barcode14 || undefined,
  };
};

const toMappingProfile = (profile: any): MappingProfile => ({
  id: pickBusinessOrInternalId(profile.profile_code, profile.id),
  name: profile.name,
  isActive: profile.is_active,
  fields: {
    pedido: profile.field_pedido,
    nit: profile.field_nit,
    sku: profile.field_sku,
    cantidad: profile.field_cantidad,
    orden: profile.field_orden,
    lote: profile.field_lote,
    vencimiento: profile.field_vencimiento,
    fabricacion: profile.field_fabricacion,
    codigoTienda: profile.field_codigo_tienda,
  },
});

const buildGroupedProcesses = (
  processes: any[],
  orders: any[],
  assignments: any[],
  items: any[],
  boxes: any[],
  boxItems: any[],
  users: User[],
  ownerCodeById: Map<string, string>,
  userCodeByDbId: Map<string, string>
): GroupedOrder[] => {
  const boxItemsByBoxId = new Map<string, any[]>();
  boxItems.forEach((item) => {
    const current = boxItemsByBoxId.get(item.order_box_id) || [];
    current.push(item);
    boxItemsByBoxId.set(item.order_box_id, current);
  });

  const boxesByOrderId = new Map<string, OrderBox[]>();
  boxes.forEach((box) => {
    const current = boxesByOrderId.get(box.order_id) || [];
    current.push({
      boxNumber: box.box_number,
      items: (boxItemsByBoxId.get(box.id) || []).map((item) => ({
        productCode: item.product_code,
        description: item.description,
        quantity: Number(item.quantity || 0),
        batch: item.batch || undefined,
      })),
    });
    boxesByOrderId.set(box.order_id, current);
  });

  const itemsByOrderId = new Map<string, OrderItem[]>();
  items.forEach((item) => {
    const current = itemsByOrderId.get(item.order_id) || [];
    current.push({
      productCode: item.product_code,
      description: item.description,
      batch: item.batch,
      expiryDate: item.expiry_date || "",
      productionDate: item.production_date || "",
      quantity: Number(item.quantity || 0),
      verifiedQuantity: Number(item.verified_quantity || 0),
      boxes: Number(item.boxes || 0),
      boxFactor: item.box_factor != null ? Number(item.box_factor) : undefined,
      status: item.status,
    });
    itemsByOrderId.set(item.order_id, current);
  });

  const assignmentsByOrderId = new Map<string, string[]>();
  assignments.forEach((assignment) => {
    const current = assignmentsByOrderId.get(assignment.order_id) || [];
    current.push(userCodeByDbId.get(String(assignment.user_id)) || String(assignment.user_id));
    assignmentsByOrderId.set(assignment.order_id, current);
  });

  const ordersByProcessId = new Map<string, OrderGroup[]>();
  orders.forEach((order) => {
    const current = ordersByProcessId.get(order.process_id) || [];
    current.push({
      id: pickBusinessOrInternalId(order.external_order_id, order.id),
      orderNumber: order.order_number,
      customerName: order.customer_name,
      nit: order.nit,
      storeName: order.store_name,
      storeCode: order.store_code,
      totalQuantity: Number(order.total_quantity || 0),
      totalBoxes: Number(order.total_boxes || 0),
      status: order.status,
      items: itemsByOrderId.get(order.id) || [],
      boxes: boxesByOrderId.get(order.id) || [],
      assignedTo: assignmentsByOrderId.get(order.id) || [],
      isFinalized: order.is_finalized,
      finalizedAt: order.finalized_at || undefined,
      ownerId: order.owner_id ? ownerCodeById.get(String(order.owner_id)) || String(order.owner_id) : undefined,
    });
    ordersByProcessId.set(order.process_id, current);
  });

  const usersById = new Map(users.map((user) => [user.id, user]));

  return processes.map((process) => ({
    id: pickBusinessOrInternalId(process.process_code, process.id),
    name: process.name,
    type: process.process_type,
    certificationDate: process.certification_date,
    ownerId: process.owner_id ? ownerCodeById.get(String(process.owner_id)) || String(process.owner_id) : undefined,
    notes: process.notes,
    hasBalances: process.has_balances,
    orders: ordersByProcessId.get(process.id) || [],
    status: process.status,
    progress: Number(process.progress || 0),
    creationDate: process.created_at,
    createdBy: process.created_by_user_id
      ? usersById.get(userCodeByDbId.get(String(process.created_by_user_id)) || String(process.created_by_user_id))
      : undefined,
  }));
};

export const getBootstrapData = async (): Promise<AppBootstrapData> => {
  const [
    rolesResult,
    permissionsResult,
    ownersResult,
    customersResult,
    storesResult,
    materialsResult,
    uomsResult,
    mappingProfilesResult,
    usersResult,
    accessResult,
    processesResult,
    ordersResult,
    assignmentsResult,
    itemsResult,
    boxesResult,
    boxItemsResult,
  ] = await Promise.all([
    supabaseAdmin.from("app_roles").select("*"),
    supabaseAdmin.from("role_module_permissions").select("*"),
    supabaseAdmin.from("owners").select("*"),
    supabaseAdmin.from("customers").select("*"),
    supabaseAdmin.from("stores").select("*"),
    supabaseAdmin.from("materials").select("*"),
    supabaseAdmin.from("material_uoms").select("*"),
    supabaseAdmin.from("mapping_profiles").select("*"),
    supabaseAdmin.from("app_users").select("*"),
    supabaseAdmin.from("user_owner_access").select("*"),
    supabaseAdmin.from("certification_processes").select("*"),
    supabaseAdmin.from("process_orders").select("*"),
    supabaseAdmin.from("order_assignments").select("*"),
    supabaseAdmin.from("order_items").select("*"),
    supabaseAdmin.from("order_boxes").select("*"),
    supabaseAdmin.from("order_box_items").select("*"),
  ]);

  assertNoError(rolesResult.error, "Error cargando roles");
  assertNoError(permissionsResult.error, "Error cargando permisos por modulo");
  assertNoError(ownersResult.error, "Error cargando propietarios");
  assertNoError(customersResult.error, "Error cargando clientes");
  assertNoError(storesResult.error, "Error cargando tiendas");
  assertNoError(materialsResult.error, "Error cargando materiales");
  assertNoError(uomsResult.error, "Error cargando UOMs");
  assertNoError(mappingProfilesResult.error, "Error cargando homologaciones");
  assertNoError(usersResult.error, "Error cargando usuarios");
  assertNoError(accessResult.error, "Error cargando accesos de usuarios");
  assertNoError(processesResult.error, "Error cargando procesos");
  assertNoError(ordersResult.error, "Error cargando pedidos");
  assertNoError(assignmentsResult.error, "Error cargando asignaciones");
  assertNoError(itemsResult.error, "Error cargando items de pedidos");
  assertNoError(boxesResult.error, "Error cargando cajas");
  assertNoError(boxItemsResult.error, "Error cargando items por caja");

  const roles = (rolesResult.data || []).map((role) =>
    toRole(role, permissionsResult.data || [])
  );
  const roleCodeById = new Map(
    (rolesResult.data || []).map((role) => [String(role.id), role.role_code || String(role.id)])
  );
  const ownerCodeById = new Map(
    (ownersResult.data || []).map((owner) => [String(owner.id), owner.owner_code || String(owner.id)])
  );
  const customerNitById = new Map(
    (customersResult.data || []).map((customer) => [String(customer.id), customer.nit])
  );
  const userCodeByDbId = new Map(
    (usersResult.data || []).map((user) => [String(user.id), user.user_code || String(user.id)])
  );
  const users = (usersResult.data || []).map((user) =>
    toUser(user, accessResult.data || [], roleCodeById, ownerCodeById)
  );

  return {
    owners: (ownersResult.data || []).map((owner) => ({
      id: owner.owner_code || String(owner.id),
      name: owner.name,
      nit: owner.nit,
      city: owner.city,
      address: owner.address,
      phone: owner.phone || undefined,
      email: owner.email || undefined,
      isActive: owner.is_active,
    })),
    customers: (customersResult.data || []).map((customer) => ({
      id: pickBusinessOrInternalId(customer.customer_code, customer.id),
      ownerId: ownerCodeById.get(String(customer.owner_id)) || String(customer.owner_id),
      name: customer.name,
      nit: customer.nit,
      city: customer.city,
      address: customer.address,
      phone: customer.phone || undefined,
      isActive: customer.is_active,
    })),
    stores: (storesResult.data || []).map((store) => ({
      id: pickBusinessOrInternalId(store.store_code, store.id),
      ownerId: ownerCodeById.get(String(store.owner_id)) || String(store.owner_id),
      name: store.name,
      code: store.store_code,
      city: store.city,
      address: store.address,
      phone: store.phone || undefined,
      customerNit: customerNitById.get(String(store.customer_id)) || "",
      isActive: store.is_active,
    })),
    materials: (materialsResult.data || []).map((material) =>
      toMaterial(material, uomsResult.data || [], customerNitById, ownerCodeById)
    ),
    mappingProfiles: (mappingProfilesResult.data || []).map(toMappingProfile),
    roles,
    users,
    groupedProcesses: buildGroupedProcesses(
      processesResult.data || [],
      ordersResult.data || [],
      assignmentsResult.data || [],
      itemsResult.data || [],
      boxesResult.data || [],
      boxItemsResult.data || [],
      users,
      ownerCodeById,
      userCodeByDbId
    ),
  };
};

export const syncOwners = async (owners: Owner[]) => {
  const { data: existingOwners, error: existingOwnersError } = await supabaseAdmin
    .from("owners")
    .select("id, owner_code, nit");
  assertNoError(existingOwnersError, "Error consultando propietarios existentes");

  const existingByCode = new Map(
    (existingOwners || [])
      .filter((owner) => owner.owner_code)
      .map((owner) => [owner.owner_code, owner])
  );
  const existingByNit = new Map(
    (existingOwners || []).map((owner) => [owner.nit, owner])
  );

  for (const owner of owners) {
    const matchedOwner = existingByCode.get(owner.id) || existingByNit.get(owner.nit);
    const payload = {
      owner_code: matchedOwner?.owner_code || owner.id,
      name: owner.name,
      nit: owner.nit,
      city: owner.city,
      address: owner.address,
      phone: owner.phone || null,
      email: owner.email || null,
      is_active: owner.isActive,
    };

    if (matchedOwner) {
      const { error } = await supabaseAdmin
        .from("owners")
        .update(payload)
        .eq("id", matchedOwner.id);
      assertNoError(error, "Error sincronizando propietarios");
      continue;
    }

    const { error } = await supabaseAdmin.from("owners").insert(payload);
    assertNoError(error, "Error sincronizando propietarios");
  }
};

export const syncCustomers = async (customers: Customer[]) => {
  const { data: ownerRows, error: ownerError } = await supabaseAdmin
    .from("owners")
    .select("id, owner_code, nit");
  assertNoError(ownerError, "Error consultando propietarios para clientes");

  const { data: existingCustomers, error: existingCustomersError } = await supabaseAdmin
    .from("customers")
    .select("id, customer_code, nit");
  assertNoError(existingCustomersError, "Error consultando clientes existentes");

  const ownerRowsByKey = withInternalAndBusinessKeys(ownerRows || [], (owner) => owner.owner_code);
  const existingCustomerByCode = new Map(
    (existingCustomers || [])
      .filter((customer) => customer.customer_code)
      .map((customer) => [customer.customer_code, customer])
  );
  const existingCustomerByNit = new Map(
    (existingCustomers || []).map((customer) => [customer.nit, customer])
  );

  for (const customer of customers) {
    const ownerId = customer.ownerId ? ownerRowsByKey.get(customer.ownerId)?.id : undefined;
    if (!ownerId) {
      throw new Error(`No existe el propietario ${customer.ownerId || ""} para el cliente ${customer.name}.`);
    }

    const matchedCustomer = existingCustomerByCode.get(customer.id) || existingCustomerByNit.get(customer.nit);
    const payload = {
      owner_id: ownerId,
      customer_code: matchedCustomer?.customer_code || customer.id,
      name: customer.name,
      nit: customer.nit,
      city: customer.city,
      address: customer.address,
      phone: customer.phone || null,
      is_active: customer.isActive,
    };

    if (matchedCustomer) {
      const { error } = await supabaseAdmin
        .from("customers")
        .update(payload)
        .eq("id", matchedCustomer.id);
      assertNoError(error, "Error sincronizando clientes");
      continue;
    }

    const { error } = await supabaseAdmin.from("customers").insert(payload);
    assertNoError(error, "Error sincronizando clientes");
  }
};

export const syncStores = async (stores: Store[]) => {
  const { data: ownerRows, error: ownerError } = await supabaseAdmin
    .from("owners")
    .select("id, owner_code");
  assertNoError(ownerError, "Error consultando propietarios para tiendas");

  const { data: customerRows, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id, nit");
  assertNoError(customerError, "Error consultando clientes para tiendas");

  const { data: existingStores, error: existingStoresError } = await supabaseAdmin
    .from("stores")
    .select("id, store_code");
  assertNoError(existingStoresError, "Error consultando tiendas existentes");

  const ownerRowsByKey = withInternalAndBusinessKeys(ownerRows || [], (owner) => owner.owner_code);
  const customerIdByNit = new Map(
    (customerRows || []).map((customer) => [customer.nit, customer.id])
  );
  const existingStoreByCode = new Map(
    (existingStores || []).map((store) => [store.store_code, store])
  );

  for (const store of stores) {
    const ownerId = store.ownerId ? ownerRowsByKey.get(store.ownerId)?.id : undefined;
    const customerId = customerIdByNit.get(store.customerNit);
    if (!ownerId) {
      throw new Error(`No existe el propietario ${store.ownerId || ""} para la tienda ${store.name}.`);
    }
    if (!customerId) {
      throw new Error(`No existe el cliente con NIT ${store.customerNit} para la tienda ${store.name}.`);
    }

    const matchedStore = existingStoreByCode.get(store.code) || existingStoreByCode.get(store.id);
    const payload = {
      owner_id: ownerId,
      customer_id: customerId,
      store_code: matchedStore?.store_code || store.code,
      name: store.name,
      city: store.city,
      address: store.address,
      phone: store.phone || null,
      is_active: store.isActive,
    };

    if (matchedStore) {
      const { error } = await supabaseAdmin
        .from("stores")
        .update(payload)
        .eq("id", matchedStore.id);
      assertNoError(error, "Error sincronizando tiendas");
      continue;
    }

    const { error } = await supabaseAdmin.from("stores").insert(payload);
    assertNoError(error, "Error sincronizando tiendas");
  }
};

export const syncMaterials = async (materials: Material[]) => {
  const { data: ownerRows, error: ownerError } = await supabaseAdmin
    .from("owners")
    .select("id, owner_code");
  assertNoError(ownerError, "Error consultando propietarios para materiales");

  const { data: customerRows, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id, nit");
  assertNoError(customerError, "Error consultando clientes para materiales");

  const { data: existingMaterials, error: existingMaterialsError } = await supabaseAdmin
    .from("materials")
    .select("id, material_code");
  assertNoError(existingMaterialsError, "Error consultando materiales existentes");

  const ownerRowsByKey = withInternalAndBusinessKeys(ownerRows || [], (owner) => owner.owner_code);
  const customerIdByNit = new Map(
    (customerRows || []).map((customer) => [customer.nit, customer.id])
  );

  const existingMaterialByCode = new Map(
    (existingMaterials || []).map((material) => [material.material_code, material])
  );
  const uniqueMaterials = Array.from(
    new Map(
      materials
        .filter((material) => String(material.code || "").trim() !== "")
        .map((material) => [String(material.code).trim().toLowerCase(), material])
    ).values()
  );
  const syncedMaterials: Array<{ frontendId: string; dbId: string | number }> = [];

  for (const material of uniqueMaterials) {
    const ownerId = material.ownerId ? ownerRowsByKey.get(material.ownerId)?.id || null : null;
    const customerId = material.customerNit ? customerIdByNit.get(material.customerNit) || null : null;
    const matchedMaterial = existingMaterialByCode.get(material.code) || existingMaterialByCode.get(material.id);
    const payload = {
      owner_id: ownerId,
      customer_id: customerId,
      material_code: matchedMaterial?.material_code || material.code,
      description: material.description,
      optional_code: material.optionalCode || null,
      product_type: material.productType || null,
      is_conditioned: material.isConditioned || false,
      is_active: material.isActive,
      embalaje: material.embalaje ?? null,
      primary_unit: material.primaryUnit || null,
      secondary_unit: material.secondaryUnit || null,
      barcode13: material.barcode13 || null,
      barcode14: material.barcode14 || null,
    };

    if (matchedMaterial) {
      const { error } = await supabaseAdmin
        .from("materials")
        .update(payload)
        .eq("id", matchedMaterial.id);
      assertNoError(error, "Error sincronizando materiales");
      syncedMaterials.push({ frontendId: material.id, dbId: matchedMaterial.id });
      existingMaterialByCode.set(payload.material_code, { id: matchedMaterial.id, material_code: payload.material_code });
      continue;
    }

    const { data: insertedMaterials, error: insertError } = await supabaseAdmin
      .from("materials")
      .insert(payload)
      .select("id")
      .limit(1);
    assertNoError(insertError, "Error sincronizando materiales");

    const insertedMaterial = insertedMaterials?.[0];
    if (!insertedMaterial) {
      throw new Error(`No se pudo recuperar el id del material ${material.code}.`);
    }

    syncedMaterials.push({ frontendId: material.id, dbId: insertedMaterial.id });
    existingMaterialByCode.set(payload.material_code, { id: insertedMaterial.id, material_code: payload.material_code });
  }

  const materialDbIds = syncedMaterials.map((material) => material.dbId);
  if (materialDbIds.length > 0) {
    const { error: deleteUomsError } = await supabaseAdmin
      .from("material_uoms")
      .delete()
      .in("material_id", materialDbIds);
    assertNoError(deleteUomsError, "Error limpiando UOMs previas");
  }

  const materialDbIdByFrontendId = new Map(
    syncedMaterials.map((material) => [material.frontendId, material.dbId])
  );

  const uomRows = uniqueMaterials.flatMap((material) => {
    const baseRows = buildMaterialUomPayloads(material);

    return baseRows.map((uom) => ({
      material_id: materialDbIdByFrontendId.get(material.id),
      ...uom,
    }));
  }).filter((uom) => uom.material_id != null);

  if (uomRows.length > 0) {
    const { error: uomError } = await supabaseAdmin
      .from("material_uoms")
      .insert(uomRows);
    assertNoError(uomError, "Error sincronizando UOMs");
  }
};

export const syncMappingProfiles = async (profiles: MappingProfile[]) => {
  const { data: existingProfiles, error: existingProfilesError } = await supabaseAdmin
    .from("mapping_profiles")
    .select("id, profile_code, name");
  assertNoError(existingProfilesError, "Error consultando homologaciones existentes");

  const existingProfileByCode = new Map(
    (existingProfiles || [])
      .filter((profile) => profile.profile_code)
      .map((profile) => [profile.profile_code, profile])
  );
  const existingProfileByName = new Map(
    (existingProfiles || []).map((profile) => [profile.name, profile])
  );

  for (const profile of profiles) {
    const matchedProfile = existingProfileByCode.get(profile.id) || existingProfileByName.get(profile.name);
    const payload = {
      profile_code: matchedProfile?.profile_code || profile.id,
      name: profile.name,
      is_active: profile.isActive,
      field_pedido: profile.fields.pedido,
      field_nit: profile.fields.nit,
      field_sku: profile.fields.sku,
      field_cantidad: profile.fields.cantidad,
      field_orden: profile.fields.orden,
      field_lote: profile.fields.lote,
      field_vencimiento: profile.fields.vencimiento,
      field_fabricacion: profile.fields.fabricacion,
      field_codigo_tienda: profile.fields.codigoTienda,
    };

    if (matchedProfile) {
      const { error } = await supabaseAdmin
        .from("mapping_profiles")
        .update(payload)
        .eq("id", matchedProfile.id);
      assertNoError(error, "Error sincronizando homologaciones");
      continue;
    }

    const { error } = await supabaseAdmin.from("mapping_profiles").insert(payload);
    assertNoError(error, "Error sincronizando homologaciones");
  }
};

export const syncRoles = async (roles: AppRole[]) => {
  const { data: existingRoles, error: existingRolesError } = await supabaseAdmin
    .from("app_roles")
    .select("id, role_code");
  assertNoError(existingRolesError, "Error consultando roles existentes");

  const existingRoleByCode = new Map(
    (existingRoles || []).map((role) => [role.role_code, role])
  );
  const syncedRoles: Array<{ roleCode: string; dbId: string | number }> = [];

  for (const role of roles) {
    const matchedRole = existingRoleByCode.get(role.id);
    const payload = {
      role_code: matchedRole?.role_code || role.id,
      name: role.name,
      description: role.description,
      is_active: role.isActive,
    };

    if (matchedRole) {
      const { error } = await supabaseAdmin
        .from("app_roles")
        .update(payload)
        .eq("id", matchedRole.id);
      assertNoError(error, "Error sincronizando roles");
      syncedRoles.push({ roleCode: role.id, dbId: matchedRole.id });
      continue;
    }

    const { data: insertedRoles, error: insertRoleError } = await supabaseAdmin
      .from("app_roles")
      .insert(payload)
      .select("id")
      .limit(1);
    assertNoError(insertRoleError, "Error sincronizando roles");

    const insertedRole = insertedRoles?.[0];
    if (!insertedRole) {
      throw new Error(`No se pudo recuperar el id del rol ${role.name}.`);
    }

    syncedRoles.push({ roleCode: role.id, dbId: insertedRole.id });
  }

  const roleDbIds = syncedRoles.map((role) => role.dbId);
  if (roleDbIds.length > 0) {
    const { error: deletePermissionsError } = await supabaseAdmin
      .from("role_module_permissions")
      .delete()
      .in("role_id", roleDbIds);
    assertNoError(deletePermissionsError, "Error limpiando permisos previos");
  }

  const roleDbIdByCode = new Map(
    syncedRoles.map((role) => [role.roleCode, role.dbId])
  );

  const permissionRows = roles.flatMap((role) =>
    role.permissions.map((permission) => ({
      role_id: roleDbIdByCode.get(role.id),
      module_code: permission.moduleId,
      module_name: permission.moduleName,
      can_view: permission.permissions.view,
      can_create: permission.permissions.create,
      can_edit: permission.permissions.edit,
      can_delete: permission.permissions.delete,
      can_import: permission.permissions.import || false,
      can_export: permission.permissions.export || false,
      can_print: permission.permissions.print || false,
    }))
  ).filter((permission) => permission.role_id != null);

  if (permissionRows.length > 0) {
    const { error: permissionError } = await supabaseAdmin
      .from("role_module_permissions")
      .insert(permissionRows);
    assertNoError(permissionError, "Error sincronizando permisos por modulo");
  }
};

export const syncUsers = async (users: User[]) => {
  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("app_roles")
    .select("id, role_code");
  assertNoError(rolesError, "Error consultando roles para usuarios");

  const { data: owners, error: ownersError } = await supabaseAdmin
    .from("owners")
    .select("id, owner_code");
  assertNoError(ownersError, "Error consultando propietarios para usuarios");

  const { data: existingUsers, error: existingUsersError } = await supabaseAdmin
    .from("app_users")
    .select("id, user_code, login_id, document_number, email");
  assertNoError(existingUsersError, "Error consultando usuarios existentes");

  const roleRowsByKey = withInternalAndBusinessKeys(roles || [], (role) => role.role_code);
  const ownerRowsByKey = withInternalAndBusinessKeys(owners || [], (owner) => owner.owner_code);
  const existingUserByCode = new Map(
    (existingUsers || [])
      .filter((user) => user.user_code)
      .map((user) => [user.user_code, user])
  );
  const existingUserByLoginId = new Map(
    (existingUsers || [])
      .filter((user) => user.login_id)
      .map((user) => [user.login_id, user])
  );
  const existingUserByDocument = new Map(
    (existingUsers || [])
      .filter((user) => user.document_number)
      .map((user) => [user.document_number, user])
  );
  const existingUserByEmail = new Map(
    (existingUsers || [])
      .filter((user) => user.email)
      .map((user) => [user.email, user])
  );

  const syncedUsers: Array<{ frontendId: string; dbId: string | number }> = [];

  for (const user of users) {
    const roleId = roleRowsByKey.get(String(user.role))?.id;
    if (!roleId) {
      throw new Error(`No existe el rol ${String(user.role)} en la base de datos.`);
    }

    const matchedUser =
      existingUserByCode.get(user.id) ||
      (user.loginId ? existingUserByLoginId.get(user.loginId) : undefined) ||
      (user.documentNumber ? existingUserByDocument.get(user.documentNumber) : undefined) ||
      existingUserByEmail.get(user.email);

    const payload = {
      user_code: matchedUser?.user_code || user.id,
      role_id: roleId,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar || null,
      password_hash: user.password || null,
      document_type: user.documentType || null,
      document_number: user.documentNumber || null,
      login_id: user.loginId || null,
      phone: user.phone || null,
      otp_method: user.otpMethod || "email",
      is_active: user.isActive,
      is_first_login: user.isFirstLogin ?? true,
    };

    if (matchedUser) {
      const { error: userError } = await supabaseAdmin
        .from("app_users")
        .update(payload)
        .eq("id", matchedUser.id);
      assertNoError(userError, "Error sincronizando usuarios");
      syncedUsers.push({ frontendId: user.id, dbId: matchedUser.id });
      continue;
    }

    const { data: insertedUsers, error: insertUserError } = await supabaseAdmin
      .from("app_users")
      .insert(payload)
      .select("id")
      .limit(1);
    assertNoError(insertUserError, "Error sincronizando usuarios");

    const insertedUser = insertedUsers?.[0];
    if (!insertedUser) {
      throw new Error(`No se pudo recuperar el id del usuario ${user.name}.`);
    }

    syncedUsers.push({ frontendId: user.id, dbId: insertedUser.id });
  }

  const syncedDbUserIds = syncedUsers.map((user) => user.dbId);
  if (syncedDbUserIds.length > 0) {
    const { error: deleteAccessError } = await supabaseAdmin
      .from("user_owner_access")
      .delete()
      .in("user_id", syncedDbUserIds);
    assertNoError(deleteAccessError, "Error limpiando accesos por propietario");
  }

  const dbUserIdByFrontendId = new Map(
    syncedUsers.map((user) => [user.frontendId, user.dbId])
  );
  const accessRows = users.flatMap((user) =>
    (user.ownerIds || [])
      .map((ownerId) => {
        const dbUserId = dbUserIdByFrontendId.get(user.id);
        const dbOwnerId = ownerRowsByKey.get(ownerId)?.id;

        if (!dbUserId || !dbOwnerId) {
          return null;
        }

        return {
          user_id: dbUserId,
          owner_id: dbOwnerId,
        };
      })
      .filter(Boolean)
  );

  if (accessRows.length > 0) {
    const { error: accessError } = await supabaseAdmin
      .from("user_owner_access")
      .insert(accessRows as Array<{ user_id: string | number; owner_id: string | number }>);
    assertNoError(accessError, "Error sincronizando accesos por propietario");
  }
};

export const syncGroupedProcesses = async (groupedProcesses: GroupedOrder[]) => {
  const currentCodes = groupedProcesses.map((process) => process.id);
  const [
    existingProcessesResult,
    ownersResult,
    usersResult,
    customersResult,
    storesResult,
    materialsResult,
  ] = await Promise.all([
    supabaseAdmin.from("certification_processes").select("id, process_code"),
    supabaseAdmin.from("owners").select("id, owner_code"),
    supabaseAdmin.from("app_users").select("id, user_code"),
    supabaseAdmin.from("customers").select("id, nit"),
    supabaseAdmin.from("stores").select("id, store_code"),
    supabaseAdmin.from("materials").select("id, material_code"),
  ]);
  const { data: existingProcesses, error: existingError } = existingProcessesResult;
  assertNoError(existingError, "Error consultando procesos existentes");
  assertNoError(ownersResult.error, "Error consultando propietarios para procesos");
  assertNoError(usersResult.error, "Error consultando usuarios para procesos");
  assertNoError(customersResult.error, "Error consultando clientes para procesos");
  assertNoError(storesResult.error, "Error consultando tiendas para procesos");
  assertNoError(materialsResult.error, "Error consultando materiales para procesos");

  const idsToDelete = (existingProcesses || [])
    .filter((process) => !currentCodes.includes(process.process_code))
    .map((process) => process.id);

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from("certification_processes")
      .delete()
      .in("id", idsToDelete);
    assertNoError(deleteError, "Error eliminando procesos removidos");
  }
  const ownerRowsByKey = withInternalAndBusinessKeys(ownersResult.data || [], (owner) => owner.owner_code);
  const userRowsByKey = withInternalAndBusinessKeys(usersResult.data || [], (user) => user.user_code);
  const customerIdByNit = new Map(
    (customersResult.data || []).map((customer) => [customer.nit, customer.id])
  );
  const storeRowsByKey = withInternalAndBusinessKeys(storesResult.data || [], (store) => store.store_code);
  const materialRowsByKey = withInternalAndBusinessKeys(materialsResult.data || [], (material) => material.material_code);
  const existingProcessByCode = new Map(
    (existingProcesses || []).map((process) => [process.process_code, process])
  );

  const syncedProcesses: Array<{ frontendId: string; dbId: string | number }> = [];
  for (const process of groupedProcesses) {
    const ownerId = process.ownerId ? ownerRowsByKey.get(process.ownerId)?.id : undefined;
    if (!ownerId) {
      throw new Error(`No existe el propietario ${process.ownerId || ""} para el proceso ${process.name}.`);
    }

    const matchedProcess = existingProcessByCode.get(process.id);
    const payload = {
      process_code: matchedProcess?.process_code || process.id,
      owner_id: ownerId,
      created_by_user_id: process.createdBy?.id ? userRowsByKey.get(process.createdBy.id)?.id || null : null,
      name: process.name,
      process_type: process.type,
      certification_date: process.certificationDate,
      notes: process.notes,
      has_balances: process.hasBalances,
      status: process.status,
      progress: process.progress,
    };

    if (matchedProcess) {
      const { error: processError } = await supabaseAdmin
        .from("certification_processes")
        .update(payload)
        .eq("id", matchedProcess.id);
      assertNoError(processError, "Error sincronizando procesos");
      syncedProcesses.push({ frontendId: process.id, dbId: matchedProcess.id });
      continue;
    }

    const { data: insertedProcesses, error: insertProcessError } = await supabaseAdmin
      .from("certification_processes")
      .insert(payload)
      .select("id")
      .limit(1);
    assertNoError(insertProcessError, "Error sincronizando procesos");

    const insertedProcess = insertedProcesses?.[0];
    if (!insertedProcess) {
      throw new Error(`No se pudo recuperar el id del proceso ${process.name}.`);
    }

    syncedProcesses.push({ frontendId: process.id, dbId: insertedProcess.id });
  }

  const processDbIds = syncedProcesses.map((process) => process.dbId);
  if (processDbIds.length > 0) {
    const { error: deleteOrdersError } = await supabaseAdmin
      .from("process_orders")
      .delete()
      .in("process_id", processDbIds);
    assertNoError(deleteOrdersError, "Error limpiando pedidos previos de procesos");
  }

  const processDbIdByFrontendId = new Map(
    syncedProcesses.map((process) => [process.frontendId, process.dbId])
  );
  const orderRows = groupedProcesses.flatMap((process) =>
    process.orders.map((order) => ({
      frontendProcessId: process.id,
      frontendOrderId: order.id,
      payload: {
        process_id: processDbIdByFrontendId.get(process.id),
        owner_id: order.ownerId ? ownerRowsByKey.get(order.ownerId)?.id || null : process.ownerId ? ownerRowsByKey.get(process.ownerId)?.id || null : null,
        customer_id: customerIdByNit.get(order.nit) || null,
        store_id: storeRowsByKey.get(order.storeCode)?.id || null,
        external_order_id: order.id,
        order_number: order.orderNumber,
        customer_name: order.customerName,
        nit: order.nit,
        store_name: order.storeName,
        store_code: order.storeCode,
        total_quantity: order.totalQuantity,
        total_boxes: order.totalBoxes,
        status: order.status,
        is_finalized: order.isFinalized || false,
        finalized_at: order.finalizedAt || null,
      },
    }))
  ).filter((row) => row.payload.process_id != null);

  const dbOrderIdByFrontendKey = new Map<string, string | number>();
  for (const row of orderRows) {
    const { data: insertedOrders, error: orderError } = await supabaseAdmin
      .from("process_orders")
      .insert(row.payload)
      .select("id")
      .limit(1);
    assertNoError(orderError, "Error insertando pedidos de procesos");

    const insertedOrder = insertedOrders?.[0];
    if (!insertedOrder) {
      throw new Error(`No se pudo recuperar el id del pedido ${row.frontendOrderId}.`);
    }

    dbOrderIdByFrontendKey.set(`${row.frontendProcessId}::${row.frontendOrderId}`, insertedOrder.id);
  }

  const assignmentRows = groupedProcesses.flatMap((process) =>
    process.orders.flatMap((order) =>
      (order.assignedTo || []).map((userId) => {
        const dbOrderId = dbOrderIdByFrontendKey.get(`${process.id}::${order.id}`);
        const dbUserId = userRowsByKey.get(userId)?.id;
        if (!dbOrderId || !dbUserId) {
          return null;
        }

        return {
          order_id: dbOrderId,
          user_id: dbUserId,
        };
      })
    )
  ).filter(Boolean);

  if (assignmentRows.length > 0) {
    const { error: assignmentError } = await supabaseAdmin
      .from("order_assignments")
      .insert(assignmentRows as Array<{ order_id: string | number; user_id: string | number }>);
    assertNoError(assignmentError, "Error insertando asignaciones de pedidos");
  }

  const itemRows = groupedProcesses.flatMap((process) =>
    process.orders.flatMap((order) =>
      order.items.map((item) => {
        const dbOrderId = dbOrderIdByFrontendKey.get(`${process.id}::${order.id}`);
        if (!dbOrderId) {
          return null;
        }

        return {
          order_id: dbOrderId,
          material_id: materialRowsByKey.get(item.productCode)?.id || null,
          product_code: item.productCode,
          description: item.description,
          batch: item.batch,
          expiry_date: item.expiryDate,
          production_date: item.productionDate,
          quantity: item.quantity,
          verified_quantity: item.verifiedQuantity,
          boxes: item.boxes,
          box_factor: item.boxFactor || null,
          status: item.status,
        };
      })
    )
  ).filter(Boolean);

  if (itemRows.length > 0) {
    const { error: itemError } = await supabaseAdmin
      .from("order_items")
      .insert(itemRows as Array<Record<string, unknown>>);
    assertNoError(itemError, "Error insertando items de pedidos");
  }

  const boxRows = groupedProcesses.flatMap((process) =>
    process.orders.flatMap((order) =>
      (order.boxes || []).map((box) => {
        const dbOrderId = dbOrderIdByFrontendKey.get(`${process.id}::${order.id}`);
        if (!dbOrderId) {
          return null;
        }

        return {
          frontendProcessId: process.id,
          frontendOrderId: order.id,
          boxNumber: box.boxNumber,
          payload: {
            order_id: dbOrderId,
            box_number: box.boxNumber,
          },
        };
      })
    )
  ).filter(Boolean) as Array<{ frontendProcessId: string; frontendOrderId: string; boxNumber: number; payload: { order_id: string | number; box_number: number } }>;

  const dbBoxIdByFrontendKey = new Map<string, string | number>();
  for (const row of boxRows) {
    const { data: insertedBoxes, error: boxError } = await supabaseAdmin
      .from("order_boxes")
      .insert(row.payload)
      .select("id")
      .limit(1);
    assertNoError(boxError, "Error insertando cajas de pedidos");

    const insertedBox = insertedBoxes?.[0];
    if (!insertedBox) {
      throw new Error(`No se pudo recuperar el id de la caja ${row.boxNumber}.`);
    }

    dbBoxIdByFrontendKey.set(`${row.frontendProcessId}::${row.frontendOrderId}::${row.boxNumber}`, insertedBox.id);
  }

  const boxItemRows = groupedProcesses.flatMap((process) =>
    process.orders.flatMap((order) =>
      (order.boxes || []).flatMap((box) =>
        box.items.map((item) => {
          const dbBoxId = dbBoxIdByFrontendKey.get(`${process.id}::${order.id}::${box.boxNumber}`);
          if (!dbBoxId) {
            return null;
          }

          return {
            order_box_id: dbBoxId,
            material_id: materialRowsByKey.get(item.productCode)?.id || null,
            product_code: item.productCode,
            description: item.description,
            quantity: item.quantity,
            batch: item.batch || null,
          };
        })
      )
    )
  ).filter(Boolean);

  if (boxItemRows.length > 0) {
    const { error: boxItemError } = await supabaseAdmin
      .from("order_box_items")
      .insert(boxItemRows as Array<Record<string, unknown>>);
    assertNoError(boxItemError, "Error insertando items por caja");
  }
};

import type {
  AppRole,
  Customer,
  GroupedOrder,
  MappingProfile,
  Material,
  Owner,
  Store,
  User,
} from "@/lib/types";

export type AppBootstrapData = {
  owners: Owner[];
  customers: Customer[];
  stores: Store[];
  materials: Material[];
  mappingProfiles: MappingProfile[];
  roles: AppRole[];
  users: User[];
  groupedProcesses: GroupedOrder[];
};

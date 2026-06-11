export type RoleScopeType =
  | 'workspace'
  | 'organization'
  | 'project'
  | 'inventory';

export const RoleScopeTypes: RoleScopeType[] = [
  'workspace',
  'organization',
  'project',
  'inventory',
];

export interface CreateRoleRequest {
  name: string;
  scopeType: RoleScopeType;
  scopeId: string;
  // isSystem: boolean;
  createdBy: string;
}

export interface CreateRoleResponse {
  roleId: string;
}

export interface UpdateRoleRequest {
  roleId: string;
  name?: string;
  isEditable?: boolean;
  isDeletable?: boolean;
  scopeId: string;
}

export interface UpdateRoleResponse {
  success: boolean;
}

export interface DeleteRoleRequest {
  roleId: string;
  scopeId: string;
}

export interface DeleteRoleResponse {
  success: boolean;
}

export interface AssignPermissionsRequest {
  roleId: string;
  scopeId: string;
  permissionIds: string[];
}

export interface AssignPermissionsResponse {
  success: boolean;
}

export interface RemovePermissionsRequest {
  roleId: string;
  scopeId: string;
  permissionIds: string[];
}

export interface RemovePermissionsResponse {
  success: boolean;
}

export interface GetRolePermissionsRequest {
  roleId: string;
}

export interface GetRolePermissionsResponse {
  permissions: string[];
}

export interface ListRolesRequest {
  scopeType: RoleScopeType;
  scopeId: string;
  includeSystemRoles?: boolean;
}

export interface Role {
  id: string;
  name: string;
  isSystem: boolean;
  isEditable: boolean;
  isDeletable: boolean;
}

export interface ListRolesResponse {
  roles: Role[];
}

export interface CheckPermissionRequest {
  roleId: string;
  scopeId: string;
  permission: string;
}

export interface CheckPermissionResponse {
  allowed: boolean;
}

export interface GetUserRolesRequest {
  roleIds: string[];
  scope: string;
  scopeId: string;
  includeArchived?: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
}

export interface GetUserRolesResponse {
  scope: string;
  scopeId: string;
  roles: UserRole[];
}

export interface Permission {
  id: string;
  name: string;
  // resource: string;
  // action: string;
  // description?: string;
  // tags?: string[];
}

export interface ListPermissionsResponse {
  permissions: Permission[];
  totalCount?: number;
}

export interface SearchRolesRequest {
  scope: string;
  scopeId: string;
  query: string;
  includeSystem?: boolean;
  limit?: number;
}

export interface SearchRolesResponse {
  roles: Role[];
  totalFound?: number;
}

export interface BatchCheckPermissionsRequest {
  roleId: string;
  permissions: string[];
  scopeId: string;
}

export interface BatchCheckPermissionsResponse {
  results: Record<string, boolean>;
}

export interface CreateSystemRolesRequest {
  scopeType: RoleScopeType;
  scopeId: string;
  createdBy: string;
}

export interface CreateSystemRolesResponse {
  roles: Role[];
}

export interface StaticRole {
  id: string;
  name: string;
}

export interface GetStaticRolesResponse {
  roles: StaticRole[];
}

export interface GetStaticRolesRequest {
  scopeId: string;
}

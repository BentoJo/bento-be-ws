export interface GetWorkspaceRolesRequest {
  workspaceId: string;
}

export interface WorkspaceRole {
  authzRoleId: string;

  roleName: string;

  isSystemRole: boolean;
}

export interface GetWorkspaceRolesResponse {
  workspaceId: string;

  roles: WorkspaceRole[];
}

export interface WorkspaceRoleReferenceResponse {
  id: string;

  workspaceId: string;

  authzRoleId: string;

  roleName: string;

  isSystemRole: boolean;
}

export interface DeleteWorkspaceRoleReferenceRequest {
  workspaceId: string;

  authzRoleId: string;
}

export interface GetWorkspaceRoleFromAuthZRequest {
  workspaceId: string;

  authzRoleId: string;
}

export interface GetWorkspaceRolesPermissionsFromAuthZRequest {
  workspaceId: string;

  authzRoleId: string;
}

export interface WorkspaceRolePermissionsResponse {
  permissions: string[];
}

export interface GetWorkspaceMemberRoleRequest {
  workspaceId: string;

  userId: string;
}

export interface GetWorkspaceMemberRoleResponse {
  authzRoleId: string;
}

export interface CheckPermissionRequest {
  workspaceId: string;

  scopeType: string;

  scopeId: string;

  resourceType: string;

  action: string;

  userId: string;
}

export interface CheckPermissionResponse {
  allowed: boolean;
}

import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';

import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import type {
  CheckPermissionRequest,
  CheckPermissionResponse,
  DeleteWorkspaceRoleReferenceRequest,
  GetWorkspaceMemberRoleRequest,
  GetWorkspaceMemberRoleResponse,
  GetWorkspaceRoleFromAuthZRequest,
  GetWorkspaceRolesPermissionsFromAuthZRequest,
  GetWorkspaceRolesRequest,
  GetWorkspaceRolesResponse,
  WorkspaceRolePermissionsResponse,
  WorkspaceRoleReferenceResponse,
} from './types';
import { GetWorkspaceRoleFromAuthZService } from './services/get-workspace-role-from-authz.service';
import { GetWorkspaceRolesPermissionsFromAuthZService } from './services/get-workspace-roles-permissions-from-authz.service';
import { DeleteWorkspaceRoleService } from './services/delete-workspace-role.service';
import { GetWorkspaceMemberRoleService } from './services/get-workspace-member-role.service';
import { CheckPermissionService } from './services/check-permission.service';
import { GetWorkspaceRolesService } from './services/get-workspace-roles.service';

@Controller()
export class WorkspaceRolesController {
  constructor(
    private readonly getWorkspaceRoleFromAuthZService: GetWorkspaceRoleFromAuthZService,
    private readonly getWorkspaceRolesPermissionsFromAuthZService: GetWorkspaceRolesPermissionsFromAuthZService,
    private readonly deleteWorkspaceRoleService: DeleteWorkspaceRoleService,
    private readonly getWorkspaceMemberRoleService: GetWorkspaceMemberRoleService,
    private readonly checkPermissionService: CheckPermissionService,
    private readonly getWorkspaceRolesService: GetWorkspaceRolesService,
  ) {}

  @GrpcMethod('WorkspaceRoleService', 'GetWorkspaceRoleFromAuthZ')
  getWorkspaceRoleFromAuthZ(
    @Payload() data: GetWorkspaceRoleFromAuthZRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<WorkspaceRoleReferenceResponse> {
    return this.getWorkspaceRoleFromAuthZService.getWorkspaceRoleFromAuthZ(
      data,
      user,
    );
  }

  @GrpcMethod('WorkspaceRoleService', 'GetWorkspaceRolesPermissionsFromAuthZ')
  getWorkspaceRolesPermissionsFromAuthZ(
    @Payload() data: GetWorkspaceRolesPermissionsFromAuthZRequest,
  ): Promise<WorkspaceRolePermissionsResponse> {
    return this.getWorkspaceRolesPermissionsFromAuthZService.getWorkspaceRolesPermissionsFromAuthZ(
      data,
    );
  }

  @GrpcMethod('WorkspaceRoleService', 'DeleteWorkspaceRole')
  deleteWorkspaceRole(
    @Payload() data: DeleteWorkspaceRoleReferenceRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.deleteWorkspaceRoleService.deleteWorkspaceRole(data, user);
  }

  @GrpcMethod('WorkspaceRoleService', 'GetWorkspaceMemberRole')
  getWorkspaceMemberRole(
    @Payload() data: GetWorkspaceMemberRoleRequest,
  ): Promise<GetWorkspaceMemberRoleResponse> {
    return this.getWorkspaceMemberRoleService.getWorkspaceMemberRole(data);
  }

  @GrpcMethod('WorkspaceRoleService', 'CheckPermission')
  checkPermission(
    @Payload() data: CheckPermissionRequest,
  ): Promise<CheckPermissionResponse> {
    return this.checkPermissionService.checkPermission(data);
  }

  @GrpcMethod('WorkspaceRoleService', 'GetWorkspaceRoles')
  getWorkspaceRoles(
    @Payload() data: GetWorkspaceRolesRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<GetWorkspaceRolesResponse> {
    return this.getWorkspaceRolesService.getWorkspaceRoles(data, user);
  }
}

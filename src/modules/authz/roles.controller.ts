import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload, RpcException } from '@nestjs/microservices';

import { AuthzService } from './authz.service';
import type {
  CreateRoleRequest,
  CreateRoleResponse,
  UpdateRoleRequest,
  UpdateRoleResponse,
  DeleteRoleRequest,
  DeleteRoleResponse,
  AssignPermissionsRequest,
  AssignPermissionsResponse,
  RemovePermissionsRequest,
  RemovePermissionsResponse,
} from './types';
import { Observable } from 'rxjs';
import { GrpcUser } from '../../shared/decorators/meta.decorator';
import { GetWorkspaceMemberRoleService } from '../workpaces/workspace-roles/services/get-workspace-member-role.service';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Controller()
export class RolesController {
  constructor(
    private readonly authzService: AuthzService,
    private readonly getWorkspaceMemberRoleService: GetWorkspaceMemberRoleService,
  ) {}

  @GrpcMethod('AuthorizationService', 'CreateRole')
  async createRole(
    @Payload() data: CreateRoleRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<Observable<CreateRoleResponse>> {
    // TODO: Check permission
    const memberRole =
      await this.getWorkspaceMemberRoleService.getWorkspaceMemberRole(
        {
          workspaceId: data.scopeId,
          userId: user.id,
        },
        user,
      );

    const perm = this.authzService.checkPermission({
      roleId: memberRole.authzRoleId,
      scopeId: data.scopeId,
      permission: 'workspace:roles:manage',
    });

    if (!perm) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }
    return this.authzService.createRole({ ...data, createdBy: user.id });
  }

  @GrpcMethod('AuthorizationService', 'UpdateRole')
  async updateRole(
    @Payload() data: UpdateRoleRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<Observable<UpdateRoleResponse>> {
    // TODO: Check permission
    const memberRole =
      await this.getWorkspaceMemberRoleService.getWorkspaceMemberRole(
        {
          workspaceId: data.scopeId,
          userId: user.id,
        },
        user,
      );

    const perm = this.authzService.checkPermission({
      roleId: memberRole.authzRoleId,
      scopeId: data.scopeId,
      permission: 'workspace:roles:manage',
    });

    if (!perm) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }
    return this.authzService.updateRole(data);
  }

  @GrpcMethod('AuthorizationService', 'DeleteRole')
  async deleteRole(
    @Payload() data: DeleteRoleRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<Observable<DeleteRoleResponse>> {
    // TODO: Check permission
    const memberRole =
      await this.getWorkspaceMemberRoleService.getWorkspaceMemberRole(
        {
          workspaceId: data.scopeId,
          userId: user.id,
        },
        user,
      );

    const perm = this.authzService.checkPermission({
      roleId: memberRole.authzRoleId,
      scopeId: data.scopeId,
      permission: 'workspace:roles:manage',
    });

    if (!perm) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }
    return this.authzService.deleteRole(data);
  }

  @GrpcMethod('AuthorizationService', 'AssignPermissionsToRole')
  async assignPermissionsToRole(
    @Payload() data: AssignPermissionsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<Observable<AssignPermissionsResponse>> {
    // TODO: Check permission
    const memberRole =
      await this.getWorkspaceMemberRoleService.getWorkspaceMemberRole(
        {
          workspaceId: data.scopeId,
          userId: user.id,
        },
        user,
      );

    const perm = this.authzService.checkPermission({
      roleId: memberRole.authzRoleId,
      scopeId: data.scopeId,
      permission: 'workspace:roles:manage',
    });

    if (!perm) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }
    return this.authzService.assignPermissions(data);
  }

  @GrpcMethod('AuthorizationService', 'RemovePermissionsFromRole')
  async removePermissionsFromRole(
    @Payload() data: RemovePermissionsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<Observable<RemovePermissionsResponse>> {
    // TODO: Check permission
    const memberRole =
      await this.getWorkspaceMemberRoleService.getWorkspaceMemberRole(
        {
          workspaceId: data.scopeId,
          userId: user.id,
        },
        user,
      );

    const perm = this.authzService.checkPermission({
      roleId: memberRole.authzRoleId,
      scopeId: data.scopeId,
      permission: 'workspace:roles:manage',
    });

    if (!perm) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }
    return this.authzService.removePermissions(data);
  }
}

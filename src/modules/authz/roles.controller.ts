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
  ListPermissionsResponse,
} from './types';
import { firstValueFrom, Observable } from 'rxjs';
import { GrpcUser } from '../../shared/decorators/meta.decorator';
import { status as GrpcStatus } from '@grpc/grpc-js';
import db from '../../shared/configs/db.config';
import { workspaceMembers, workspaceRoles } from '../../shared/db/schema';
import { eq, and } from 'drizzle-orm';

@Controller()
export class RolesController {
  constructor(private readonly authzService: AuthzService) {}

  async getWorkspaceMemberRole(user: GrpcUser, workspaceId: string) {
    try {
      const memberRole = await db
        .select({
          authzRoleId: workspaceMembers.authzRoleId,
        })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, user.id),
            eq(workspaceMembers.isActive, true),
          ),
        )
        .limit(1)
        .then((res) => res[0]);
      return memberRole;
    } catch {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to get workspace member role',
      });
    }
  }

  @GrpcMethod('AuthorizationService', 'CreateRole')
  async createRole(
    @Payload() data: CreateRoleRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<CreateRoleResponse> {
    const memberRole = await this.getWorkspaceMemberRole(user, data.scopeId);

    if (!memberRole?.authzRoleId) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const perm = await firstValueFrom(
      this.authzService.checkPermission({
        roleId: memberRole.authzRoleId,
        scopeId: data.scopeId,
        permission: 'workspace:roles:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const createdRole = await firstValueFrom(
      this.authzService.createRole({ ...data, createdBy: user.id }),
    );

    await db.insert(workspaceRoles).values({
      workspaceId: data.scopeId,
      authzRoleId: createdRole.roleId,
      // isSystem: data.isSystem,
      createdBy: user.id,
    });

    return createdRole;
  }

  @GrpcMethod('AuthorizationService', 'UpdateRole')
  async updateRole(
    @Payload() data: UpdateRoleRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<Observable<UpdateRoleResponse>> {
    // TODO: Check permission
    const memberRole = await this.getWorkspaceMemberRole(user, data.scopeId);

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
    const memberRole = await this.getWorkspaceMemberRole(user, data.scopeId);

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
    const memberRole = await this.getWorkspaceMemberRole(user, data.scopeId);

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
    const memberRole = await this.getWorkspaceMemberRole(user, data.scopeId);

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

  // Catalogue of all permission descriptors (global, no scope). The gateway's
  // authz client routes AuthorizationService calls here; this handler was
  // missing, which made GET /workspace/:id/permissions return 501.
  @GrpcMethod('AuthorizationService', 'ListPermissions')
  listPermissions(): Observable<ListPermissionsResponse> {
    return this.authzService.listPermissions();
  }
}

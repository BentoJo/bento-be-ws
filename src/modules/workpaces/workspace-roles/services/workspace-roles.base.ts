import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { and, eq } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { AuthzService } from '../../../authz/authz.service';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { workspaceMembers, workspaceRoles } from '../../../../shared/db/schema';
import type { ActionResponse } from '../../../../shared/types/genereal';
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
} from '../types';

interface AuthorizationRoleItem {
  id: string;
  name: string;
  isSystem: boolean;
}

@Injectable()
export abstract class WorkspaceRolesBaseService {
  constructor(
    protected readonly workspaceFuncs: WorkspaceFuncs,
    protected readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    protected readonly authZ: AuthzService,
  ) {}

  protected async getWorkspaceRoleFromAuthZ(
    data: GetWorkspaceRoleFromAuthZRequest,
    user: GrpcUser,
  ): Promise<WorkspaceRoleReferenceResponse> {
    this.validateWorkspaceRoleRequest(data);
    this.requireUser(user);
    await this.requireWorkspace(data.workspaceId);
    const requesterMember = await this.requireWorkspaceMember(
      data.workspaceId,
      user.id,
    );
    await this.requirePermission(
      requesterMember.authzRoleId,
      data.workspaceId,
      'workspace:roles:manage',
    );

    const authzRole = await this.getAuthzRole(
      data.workspaceId,
      data.authzRoleId,
    );

    const existingRole = await db
      .select()
      .from(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.workspaceId, data.workspaceId),
          eq(workspaceRoles.authzRoleId, data.authzRoleId),
        ),
      )
      .limit(1);

    const currentRole = existingRole[0];

    if (!currentRole) {
      const [insertedRole] = await db
        .insert(workspaceRoles)
        .values({
          workspaceId: data.workspaceId,
          authzRoleId: data.authzRoleId,
          isSystem: authzRole.isSystem,
          createdBy: user.id,
        })
        .returning();

      if (!insertedRole) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: 'Failed to sync workspace role from AuthZ',
        });
      }

      return {
        id: insertedRole.id,
        workspaceId: insertedRole.workspaceId,
        authzRoleId: insertedRole.authzRoleId,
        roleName: authzRole.name,
        isSystemRole: authzRole.isSystem,
      };
    }

    return {
      id: currentRole.id,
      workspaceId: currentRole.workspaceId,
      authzRoleId: currentRole.authzRoleId,
      roleName: authzRole.name,
      isSystemRole: authzRole.isSystem,
    };
  }

  protected async getWorkspaceRolesPermissionsFromAuthZ(
    data: GetWorkspaceRolesPermissionsFromAuthZRequest,
  ): Promise<WorkspaceRolePermissionsResponse> {
    this.validateWorkspaceRoleRequest(data);
    await this.requireWorkspace(data.workspaceId);

    const role = await db
      .select()
      .from(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.workspaceId, data.workspaceId),
          eq(workspaceRoles.authzRoleId, data.authzRoleId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!role) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace role not found',
      });
    }

    const permissionsResponse = await firstValueFrom(
      this.authZ.getRolePermissions({ roleId: data.authzRoleId }),
    );

    return {
      permissions: permissionsResponse.permissions ?? [],
    };
  }

  protected async deleteWorkspaceRole(
    data: DeleteWorkspaceRoleReferenceRequest,
    user: GrpcUser,
  ): Promise<ActionResponse> {
    this.validateWorkspaceRoleRequest(data);
    this.requireUser(user);
    await this.requireWorkspace(data.workspaceId);

    const requesterMember = await this.requireWorkspaceMember(
      data.workspaceId,
      user.id,
    );
    await this.requirePermission(
      requesterMember.authzRoleId,
      data.workspaceId,
      'workspace:roles:manage',
    );

    const role = await db
      .select()
      .from(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.workspaceId, data.workspaceId),
          eq(workspaceRoles.authzRoleId, data.authzRoleId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!role) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace role not found',
      });
    }

    if (role.isSystem) {
      throw new RpcException({
        code: GrpcStatus.FAILED_PRECONDITION,
        message: 'System roles cannot be deleted',
      });
    }

    const activeMembers = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, data.workspaceId),
          eq(workspaceMembers.authzRoleId, data.authzRoleId),
          eq(workspaceMembers.isActive, true),
        ),
      );

    if (activeMembers.length > 0) {
      throw new RpcException({
        code: GrpcStatus.FAILED_PRECONDITION,
        message: 'Role is assigned to active workspace members',
      });
    }

    await db
      .delete(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.workspaceId, data.workspaceId),
          eq(workspaceRoles.authzRoleId, data.authzRoleId),
        ),
      );

    return {
      success: true,
      message: 'Workspace role deleted successfully',
    };
  }

  protected async getWorkspaceMemberRole(
    data: GetWorkspaceMemberRoleRequest,
    user: GrpcUser,
  ): Promise<GetWorkspaceMemberRoleResponse> {
    this.validateMemberRequest(data);
    await this.requireWorkspace(data.workspaceId);

    const member = await this.workspaceMembersFuncs.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    if (!member || !member.isActive) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace member not found',
      });
    }

    return {
      authzRoleId: member.authzRoleId,
    };
  }

  protected async checkPermission(
    data: CheckPermissionRequest,
    user: GrpcUser,
  ): Promise<CheckPermissionResponse> {
    this.validatePermissionRequest(data, user);
    await this.requireWorkspace(data.workspaceId);

    const member = await this.workspaceMembersFuncs.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    if (!member || !member.isActive) {
      return { allowed: false };
    }

    const permission = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: member.authzRoleId,
        scopeId: data.scopeId,
        permission: `${data.scopeType}:${data.resourceType}:${data.action}`,
      }),
    );

    return {
      allowed: !!permission?.allowed,
    };
  }

  protected async getWorkspaceRoles(
    data: GetWorkspaceRolesRequest,
    user: GrpcUser,
  ): Promise<GetWorkspaceRolesResponse> {
    this.validateWorkspaceRequest(data);
    this.requireUser(user);
    await this.requireWorkspace(data.workspaceId);

    const requesterMember = await this.requireWorkspaceMember(
      data.workspaceId,
      user.id,
    );
    await this.requirePermission(
      requesterMember.authzRoleId,
      data.workspaceId,
      'workspace:roles:manage',
    );

    const roles = await db
      .select()
      .from(workspaceRoles)
      .where(eq(workspaceRoles.workspaceId, data.workspaceId));

    if (roles.length === 0) {
      return {
        workspaceId: data.workspaceId,
        roles: [],
      };
    }

    const authzRolesResponse = await firstValueFrom(
      this.authZ.getRolesByIds({
        roleIds: roles.map((role) => role.authzRoleId),
        scope: 'workspace',
        scopeId: data.workspaceId,
      }),
    );

    const authzRolesById = new Map(
      (authzRolesResponse.roles ?? []).map((role) => [role.id, role]),
    );

    return {
      workspaceId: data.workspaceId,
      roles: roles.map((role) => {
        const authzRole = authzRolesById.get(role.authzRoleId);

        return {
          authzRoleId: role.authzRoleId,
          roleName: authzRole?.name ?? 'UNKNOWN',
          isSystemRole: authzRole?.isSystem ?? !!role.isSystem,
        };
      }),
    };
  }

  protected async requireWorkspace(workspaceId: string) {
    const workspace = await this.workspaceFuncs.findByIdActive(workspaceId);

    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    return workspace;
  }

  protected async requireWorkspaceMember(workspaceId: string, userId: string) {
    const member = await this.workspaceMembersFuncs.getWorkspaceMember(
      workspaceId,
      userId,
    );

    if (!member || !member.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    return member;
  }

  protected async requirePermission(
    roleId: string,
    scopeId: string,
    permission: string,
  ) {
    const permissionResult = await firstValueFrom(
      this.authZ.checkPermission({
        roleId,
        scopeId,
        permission,
      }),
    );

    if (!permissionResult?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    return permissionResult;
  }

  protected async getAuthzRole(workspaceId: string, authzRoleId: string) {
    const authzRoles = await firstValueFrom(
      this.authZ.getRolesByIds({
        roleIds: [authzRoleId],
        scope: 'workspace',
        scopeId: workspaceId,
      }),
    );

    const role = authzRoles.roles?.[0] as AuthorizationRoleItem | undefined;

    if (!role) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'AuthZ role not found',
      });
    }

    return role;
  }

  protected requireUser(user: GrpcUser) {
    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }
  }

  protected validateWorkspaceRequest(data: { workspaceId: string }) {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const workspaceResult = validateRequired(data.workspaceId, 'Workspace ID');
    if (!workspaceResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceResult.message,
      });
    }

    const workspaceIdResult = validateUUID(data.workspaceId, 'Workspace ID');
    if (!workspaceIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdResult.message,
      });
    }
  }

  protected validateWorkspaceRoleRequest(data: {
    workspaceId: string;
    authzRoleId: string;
  }) {
    this.validateWorkspaceRequest(data);

    const authzRoleResult = validateRequired(
      data.authzRoleId,
      'Authorization Role ID',
    );
    if (!authzRoleResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: authzRoleResult.message,
      });
    }

    const authzRoleIdResult = validateUUID(
      data.authzRoleId,
      'Authorization Role ID',
    );
    if (!authzRoleIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: authzRoleIdResult.message,
      });
    }
  }

  protected validateMemberRequest(
    data: GetWorkspaceMemberRoleRequest,
    // user: GrpcUser,
  ) {
    this.validateWorkspaceRequest(data);
  }

  protected validatePermissionRequest(
    data: CheckPermissionRequest,
    user: GrpcUser,
  ) {
    this.validateWorkspaceRequest(data);

    const scopeTypeResult = validateRequired(data.scopeType, 'Scope Type');
    if (!scopeTypeResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: scopeTypeResult.message,
      });
    }

    const scopeIdResult = validateRequired(data.scopeId, 'Scope ID');
    if (!scopeIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: scopeIdResult.message,
      });
    }

    const resourceTypeResult = validateRequired(
      data.resourceType,
      'Resource Type',
    );
    if (!resourceTypeResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: resourceTypeResult.message,
      });
    }

    const actionResult = validateRequired(data.action, 'Action');
    if (!actionResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: actionResult.message,
      });
    }

    const userResult = validateRequired(user?.id, 'User ID');
    if (!userResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: userResult.message,
      });
    }

    const userIdResult = validateUUID(user?.id, 'User ID');
    if (!userIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: userIdResult.message,
      });
    }
  }
}

import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { and, eq, or } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { AuthzService } from '../../../authz/authz.service';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type {
  UpdateWorkspaceMemberRoleRequest,
  WorkspaceMemberResponse,
} from '../types';
import { workspaceMembers, workspaceRoles } from '../../../../shared/db/schema';

@Injectable()
export class UpdateWorkspaceMemberRoleService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async updateWorkspaceMemberRole(
    data: UpdateWorkspaceMemberRoleRequest,
    user: GrpcUser,
  ): Promise<WorkspaceMemberResponse> {
    this.validateInput(data);

    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    return db.transaction(async (tx) => {
      const workspace = await this.workspaceFuncs.findByIdActive(
        data.workspaceId,
      );

      if (!workspace) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Workspace not found',
        });
      }

      const requesterMember =
        await this.workspaceMembersFuncs.getWorkspaceMember(
          data.workspaceId,
          user.id,
          tx,
        );

      if (!requesterMember || !requesterMember.isActive) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Not a workspace member',
        });
      }

      const permission = await firstValueFrom(
        this.authZ.checkPermission({
          roleId: requesterMember.authzRoleId,
          scopeId: data.workspaceId,
          permission: 'workspace:roles:manage',
        }),
      );

      if (!permission?.allowed) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Permission denied',
        });
      }

      const [member] = await tx
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, data.workspaceId),
            eq(workspaceMembers.isActive, true),
            or(
              eq(workspaceMembers.id, data.memberId),
              eq(workspaceMembers.userId, data.memberId),
            ),
          ),
        )
        .limit(1);

      if (!member) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Member not found',
        });
      }

      if (member.userId === workspace.ownerUserId) {
        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: 'Cannot change workspace owner role',
        });
      }

      if (member.authzRoleId === data.authzRoleId) {
        throw new RpcException({
          code: GrpcStatus.ALREADY_EXISTS,
          message: 'Member already has the specified role',
        });
      }

      if (member.userId === user.id) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Cannot change your own role',
        });
      }

      if (requesterMember.authzRoleId === member.authzRoleId) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Cannot change role of a member with the same role as you',
        });
      }

      const [role] = await tx
        .select()
        .from(workspaceRoles)
        .where(
          and(
            eq(workspaceRoles.workspaceId, data.workspaceId),
            eq(workspaceRoles.authzRoleId, data.authzRoleId),
          ),
        )
        .limit(1);

      if (!role) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Workspace role not found',
        });
      }

      const [updatedMember] = await tx
        .update(workspaceMembers)
        .set({
          authzRoleId: data.authzRoleId,
          updatedAt: new Date(),
        })
        .where(eq(workspaceMembers.id, member.id))
        .returning();

      if (!updatedMember) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: 'Failed to update workspace member role',
        });
      }

      return {
        id: updatedMember.id,
        workspaceId: updatedMember.workspaceId,
        userId: updatedMember.userId,
        authzRoleId: updatedMember.authzRoleId,
        joinedAt: updatedMember.joinedAt ?? new Date(),
      };
    });
  }

  private validateInput(data: UpdateWorkspaceMemberRoleRequest): void {
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

    const memberResult = validateRequired(data.memberId, 'Member ID');
    if (!memberResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: memberResult.message,
      });
    }

    const memberIdResult = validateUUID(data.memberId, 'Member ID');
    if (!memberIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: memberIdResult.message,
      });
    }

    const roleResult = validateRequired(
      data.authzRoleId,
      'Authorization Role ID',
    );
    if (!roleResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: roleResult.message,
      });
    }

    const roleIdResult = validateUUID(
      data.authzRoleId,
      'Authorization Role ID',
    );
    if (!roleIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: roleIdResult.message,
      });
    }
  }
}

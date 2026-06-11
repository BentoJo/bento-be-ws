import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { and, eq, inArray } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { AuthzService } from '../../../authz/authz.service';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type { RemoveWorkspaceMemberRequest } from '../types';
import { ActionResponse } from '../../../../shared/types/genereal';
import {
  boardFavorites,
  boardMembers,
  cardAssignees,
  cardVisibilityMembers,
  teamMembers,
  watchers,
  workspaceMembers,
} from '../../../../shared/db/schema';

@Injectable()
export class RemoveWorkspaceMemberService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async removeWorkspaceMember(
    data: RemoveWorkspaceMemberRequest,
    user: GrpcUser,
  ): Promise<ActionResponse> {
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

      const requesterIsOwner = workspace.ownerUserId === user.id;
      // A member may always remove THEMSELVES (i.e. leave the workspace)
      // without holding the members:manage permission. The owner is still
      // blocked from self-removal by the owner guard below (must transfer first).
      const isSelfRemoval = data.memberId === user.id;

      if (!requesterIsOwner && !isSelfRemoval) {
        const requesterMember =
          await this.workspaceMembers.checkWorkspaceMember({
            workspaceId: data.workspaceId,
            userId: user.id,
          });

        if (!requesterMember || !requesterMember.isActive) {
          throw new RpcException({
            code: GrpcStatus.PERMISSION_DENIED,
            message: 'Not allowed to remove workspace members',
          });
        }

        const permission = await firstValueFrom(
          this.authZ.checkPermission({
            roleId: requesterMember.authzRoleId,
            scopeId: data.workspaceId,
            permission: 'workspace:members:manage',
          }),
        );

        if (!permission?.allowed) {
          throw new RpcException({
            code: GrpcStatus.PERMISSION_DENIED,
            message: 'Permission denied',
          });
        }
      }

      const [member] = await tx
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.userId, data.memberId),
            eq(workspaceMembers.workspaceId, data.workspaceId),
            eq(workspaceMembers.isActive, true),
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
          message: 'Cannot remove workspace owner',
        });
      }

      const boardMemberRows = await tx
        .select({ id: boardMembers.id })
        .from(boardMembers)
        .where(eq(boardMembers.workspaceMemberId, member.id));

      const boardMemberIds = boardMemberRows.map((row) => row.id);

      await tx
        .delete(teamMembers)
        .where(eq(teamMembers.workspaceMemberId, member.id));

      await tx
        .delete(boardFavorites)
        .where(eq(boardFavorites.workspaceMemberId, member.id));

      if (boardMemberIds.length > 0) {
        await tx
          .delete(cardVisibilityMembers)
          .where(inArray(cardVisibilityMembers.boardMemberId, boardMemberIds));

        await tx
          .delete(cardAssignees)
          .where(inArray(cardAssignees.boardMemberId, boardMemberIds));

        await tx
          .delete(boardMembers)
          .where(inArray(boardMembers.id, boardMemberIds));
      }

      await tx
        .delete(watchers)
        .where(eq(watchers.workspaceMemberId, member.id));

      await tx
        .update(workspaceMembers)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(workspaceMembers.id, member.id));

      return {
        success: true,
        message: 'Workspace member removed successfully',
      };
    });
  }

  private validateInput(data: RemoveWorkspaceMemberRequest): void {
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
  }
}

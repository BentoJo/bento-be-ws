import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { and, eq } from 'drizzle-orm';
import { firstValueFrom } from 'rxjs';

import db from '../../../../shared/configs/db.config';
import { BoardFuncs } from '../../../../shared/func/board';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import {
  boardMembers,
  cardAssignees,
  cardVisibilityMembers,
} from '../../../../shared/db/schema';
import type { ActionResponse } from '../../../../shared/types/genereal';
import { AuthzService } from '../../../authz/authz.service';

type RemoveBoardMemberRequest = {
  workspaceId: string;
  boardId: string;
  userId: string;
};

@Injectable()
export class RemoveBoardMemberService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async removeBoardMember(
    data: RemoveBoardMemberRequest,
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

      const requesterMember = await this.workspaceMembers.getWorkspaceMember(
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

      const board = await this.boardFuncs.getActiveBoard(data.boardId, tx);

      if (!board || board.workspaceId !== data.workspaceId) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Board not found',
        });
      }

      const targetMember = await this.workspaceMembers.getWorkspaceMember(
        data.workspaceId,
        data.userId,
        tx,
      );

      if (!targetMember || !targetMember.isActive) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'User is not a workspace member',
        });
      }

      const [member] = await tx
        .select()
        .from(boardMembers)
        .where(
          and(
            eq(boardMembers.boardId, data.boardId),
            eq(boardMembers.workspaceMemberId, targetMember.id),
          ),
        )
        .limit(1);

      if (!member) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Board member not found',
        });
      }

      const permission = await firstValueFrom(
        this.authZ.checkPermission({
          roleId: requesterMember.authzRoleId,
          scopeId: data.workspaceId,
          permission: 'workspace:board_members:manage',
        }),
      );

      if (!permission?.allowed) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Permission denied',
        });
      }

      await tx
        .delete(cardVisibilityMembers)
        .where(eq(cardVisibilityMembers.boardMemberId, member.id));

      await tx
        .delete(cardAssignees)
        .where(eq(cardAssignees.boardMemberId, member.id));

      await tx.delete(boardMembers).where(eq(boardMembers.id, member.id));

      return {
        success: true,
        message: 'Board member removed successfully',
      };
    });
  }

  private validateInput(data: RemoveBoardMemberRequest) {
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

    const boardResult = validateRequired(data.boardId, 'Board ID');
    if (!boardResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: boardResult.message,
      });
    }

    const boardIdResult = validateUUID(data.boardId, 'Board ID');
    if (!boardIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: boardIdResult.message,
      });
    }

    const userResult = validateRequired(data.userId, 'User ID');
    if (!userResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: userResult.message,
      });
    }

    const userIdResult = validateUUID(data.userId, 'User ID');
    if (!userIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: userIdResult.message,
      });
    }
  }
}

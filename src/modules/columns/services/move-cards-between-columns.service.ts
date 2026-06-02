import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { AuthzService } from '../../authz/authz.service';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { BoardFuncs } from '../../../shared/func/board';
import { ColumnFuncs } from '../../../shared/func/column';
import { ActionResponse } from '../../../shared/types/genereal';
import { MoveCardsBetweenColumnsRequest } from '../types';
import { validateUUID } from '../../../shared/validations';

@Injectable()
export class MoveCardsBetweenColumnsService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly columnFuncs: ColumnFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async moveCardsBetweenColumns(
    data: MoveCardsBetweenColumnsRequest,
    user: GrpcUser,
  ): Promise<ActionResponse> {
    this.validateInput(data);

    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    const workspace = await this.workspaceFuncs.findByIdActive(
      data.workspaceId,
    );

    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    const member = await this.workspaceMembers.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    if (!member || !member.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    const permission = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:boards:manage',
      }),
    );

    if (!permission?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const board = await this.boardFuncs.getActiveBoard(data.boardId);

    if (!board || board.workspaceId !== data.workspaceId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Board not found',
      });
    }

    const sourceColumn = await this.columnFuncs.getActiveColumn(
      data.sourceColumnId,
    );

    if (!sourceColumn || sourceColumn.boardId !== data.boardId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Source column not found',
      });
    }

    const targetColumn = await this.columnFuncs.getActiveColumn(
      data.targetColumnId,
    );

    if (!targetColumn || targetColumn.boardId !== data.boardId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Target column not found',
      });
    }

    const moved = await this.columnFuncs.moveCards({
      boardId: data.boardId,
      sourceColumnId: data.sourceColumnId,
      targetColumnId: data.targetColumnId,
      cardIds: data.cardIds,
    });

    return {
      success: true,
      message: `Moved ${moved} card(s) successfully`,
    };
  }

  private validateInput(data: MoveCardsBetweenColumnsRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const workspaceIdResult = validateUUID(data.workspaceId, 'Workspace ID');
    if (!workspaceIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdResult.message,
      });
    }

    const boardIdResult = validateUUID(data.boardId, 'Board ID');
    if (!boardIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: boardIdResult.message,
      });
    }

    const sourceResult = validateUUID(data.sourceColumnId, 'Source column ID');
    if (!sourceResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: sourceResult.message,
      });
    }

    const targetResult = validateUUID(data.targetColumnId, 'Target column ID');
    if (!targetResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: targetResult.message,
      });
    }

    if (data.sourceColumnId === data.targetColumnId) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Source and target columns must be different',
      });
    }

    if (!Array.isArray(data.cardIds) || data.cardIds.length === 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'At least one card ID must be provided',
      });
    }

    for (const cardId of data.cardIds) {
      const cardResult = validateUUID(cardId, 'Card ID');
      if (!cardResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: cardResult.message,
        });
      }
    }
  }
}

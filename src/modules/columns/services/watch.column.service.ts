import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { BoardFuncs } from '../../../shared/func/board';
import { ColumnFuncs } from '../../../shared/func/column';
import { WatcherFuncs } from '../../../shared/func/watcher';
import { ActionResponse } from '../../../shared/types/genereal';
import { WatchColumnRequest } from '../types';
import { validateUUID } from '../../../shared/validations';

@Injectable()
export class WatchColumnService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly columnFuncs: ColumnFuncs,
    private readonly watcherFuncs: WatcherFuncs,
  ) {}

  async watchColumn(
    data: WatchColumnRequest,
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

    const board = await this.boardFuncs.getActiveBoard(data.boardId);

    if (!board || board.workspaceId !== data.workspaceId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Board not found',
      });
    }

    if (board.visibility !== 'public') {
      const isBoardMember = await this.boardFuncs.isBoardMember(
        data.boardId,
        user.id,
      );

      if (!isBoardMember) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Not a board member',
        });
      }
    }

    const column = await this.columnFuncs.getActiveColumn(data.columnId);

    if (!column || column.boardId !== data.boardId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Column not found',
      });
    }

    await this.watcherFuncs.watch({
      workspaceId: data.workspaceId,
      workspaceMemberId: member.id,
      watchableId: data.columnId,
      watchableType: 'column',
    });

    return {
      success: true,
      message: 'Column watched successfully',
    };
  }

  private validateInput(data: WatchColumnRequest): void {
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

    const columnIdResult = validateUUID(data.columnId, 'Column ID');
    if (!columnIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: columnIdResult.message,
      });
    }
  }
}

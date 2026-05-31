import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../../shared/func/board';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { validateUUID } from '../../../../shared/validations';
import { BoardResponse, GetBoardRequest } from '../types';

@Injectable()
export class GetBoardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly boardFuncs: BoardFuncs,
  ) {}

  async getBoard(
    data: GetBoardRequest,
    user: GrpcUser,
  ): Promise<BoardResponse> {
    this.validateInput(data);

    const workspace = await this.workspaceFuncs.findByIdActive(
      data.workspaceId,
    );

    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    const board = await this.boardFuncs.getActiveBoard(data.boardId);

    if (!board || board.workspaceId !== data.workspaceId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Board not found',
      });
    }

    const isBoardMember = user?.id
      ? await this.boardFuncs.isBoardMember(data.boardId, user.id)
      : false;

    if (board.visibility !== 'public' && !isBoardMember) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a board member',
      });
    }

    return {
      id: board.id,
      workspaceId: board.workspaceId,
      name: board.name,
      icon: board.icon ?? null,
      visibility: board.visibility ?? 'public',
      createdBy: board.createdBy,
      createdAt: board.createdAt
        ? board.createdAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private validateInput(data: GetBoardRequest): void {
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
  }
}

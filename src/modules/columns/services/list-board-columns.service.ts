import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { BoardFuncs } from '../../../shared/func/board';
import { ColumnFuncs } from '../../../shared/func/column';
import { validateUUID } from '../../../shared/validations';
import {
  ColumnListItem,
  ListBoardColumnsRequest,
  ListBoardColumnsResponse,
} from '../types';

@Injectable()
export class ListBoardColumnsService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly columnFuncs: ColumnFuncs,
  ) {}

  async listBoardColumns(
    data: ListBoardColumnsRequest,
    user: GrpcUser,
  ): Promise<ListBoardColumnsResponse> {
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

    const rows = await this.columnFuncs.listByBoard(data.boardId, {
      includeArchived: data.includeArchived ?? false,
    });

    const columns: ColumnListItem[] = await Promise.all(
      rows.map(async (column) => ({
        id: column.id,
        name: column.name,
        position: Number(column.position),
        isArchived: column.archivedAt !== null,
        cardsCount: await this.columnFuncs.countActiveCards(column.id),
      })),
    );

    return { columns };
  }

  private validateInput(data: ListBoardColumnsRequest): void {
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

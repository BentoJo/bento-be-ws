import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { BoardFuncs } from '../../../shared/func/board';
import { ColumnFuncs } from '../../../shared/func/column';
import { WatcherFuncs } from '../../../shared/func/watcher';
import { validateUUID } from '../../../shared/validations';
import {
  ListColumnWatchersRequest,
  ListColumnWatchersResponse,
  Watcher,
} from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ListColumnWatchersService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly columnFuncs: ColumnFuncs,
    private readonly watcherFuncs: WatcherFuncs,
  ) {}

  async listColumnWatchers(
    data: ListColumnWatchersRequest,
    user: GrpcUser,
  ): Promise<ListColumnWatchersResponse> {
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

    const column = await this.columnFuncs.getById(data.columnId);

    if (!column || column.boardId !== data.boardId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Column not found',
      });
    }

    const page =
      data.page && data.page > 0 ? Math.floor(data.page) : DEFAULT_PAGE;
    const limit =
      data.limit && data.limit > 0
        ? Math.min(Math.floor(data.limit), MAX_LIMIT)
        : DEFAULT_LIMIT;

    const { rows, total } = await this.watcherFuncs.list({
      watchableId: data.columnId,
      watchableType: 'column',
      page,
      limit,
    });

    const watchers: Watcher[] = rows.map((row) => ({
      userId: row.userId,
      watchedAt: row.watchedAt
        ? row.watchedAt.toISOString()
        : new Date().toISOString(),
    }));

    return {
      watchers,
      pagination: {
        page,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  private validateInput(data: ListColumnWatchersRequest): void {
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

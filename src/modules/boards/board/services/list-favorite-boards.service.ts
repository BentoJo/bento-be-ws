import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../../shared/func/board';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import {
  FavoriteBoardListItem,
  ListFavoriteBoardsRequest,
  ListFavoriteBoardsResponse,
  PaginationMeta,
} from '../types';
import { validateRequired, validateUUID } from '../../../../shared/validations';

@Injectable()
export class ListFavoriteBoardsService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
  ) {}

  async listFavoriteBoards(
    data: ListFavoriteBoardsRequest,
    user: GrpcUser,
  ): Promise<ListFavoriteBoardsResponse> {
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

    const page = Math.max(1, data.page ?? 1);
    const limit = Math.min(100, Math.max(1, data.limit ?? 20));

    const { rows, total } = await this.boardFuncs.listFavoriteBoards({
      workspaceId: data.workspaceId,
      workspaceMemberId: member.id,
      page,
      limit,
    });

    const boards: FavoriteBoardListItem[] = rows.map((row) => ({
      boardId: row.boardId,
      name: row.name,
      icon: row.icon ?? null,
      isPrivate: row.visibility !== 'public',
    }));

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
    };

    return {
      boards,
      pagination,
    };
  }

  private validateInput(data: ListFavoriteBoardsRequest): void {
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

    if (
      data.page !== undefined &&
      (!Number.isInteger(data.page) || data.page < 1)
    ) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Page must be a positive integer',
      });
    }

    if (
      data.limit !== undefined &&
      (!Number.isInteger(data.limit) || data.limit < 1)
    ) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Limit must be a positive integer',
      });
    }

    if (data.workspaceId !== undefined) {
      const requiredResult = validateRequired(data.workspaceId, 'Workspace ID');
      if (!requiredResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: requiredResult.message,
        });
      }
    }
  }
}

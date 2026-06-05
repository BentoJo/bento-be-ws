import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../shared/func/board';
import { CardFuncs } from '../../../shared/func/card';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { validateUUID } from '../../../shared/validations';
import type {
  ListBoardCardsRequest,
  ListColumnCardsRequest,
  ListCardsResponse,
  ListWorkspaceCardsByDateRequest,
} from '../types';
import { CommonFuncs } from '../../../shared/func/common';

@Injectable()
export class ListCardsService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly cardFuncs: CardFuncs,
    private readonly commonFuncs: CommonFuncs,
  ) {}

  async listColumnCards(
    data: ListColumnCardsRequest,
    user: GrpcUser,
  ): Promise<ListCardsResponse> {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    for (const [value, name] of [
      [data.workspaceId, 'Workspace ID'],
      [data.boardId, 'Board ID'],
      [data.columnId, 'Column ID'],
    ] as const) {
      this.requireUUID(value, name);
    }

    await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const rows = await this.cardFuncs.listByColumn(data.columnId, {
      includeArchived: data.includeArchived,
    });

    return { cards: rows.map((card) => this.commonFuncs.toCardResponse(card)) };
  }

  async listBoardCards(
    data: ListBoardCardsRequest,
    user: GrpcUser,
  ): Promise<ListCardsResponse> {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    for (const [value, name] of [
      [data.workspaceId, 'Workspace ID'],
      [data.boardId, 'Board ID'],
    ] as const) {
      this.requireUUID(value, name);
    }

    await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const rows = await this.cardFuncs.listByBoard(data.boardId, {
      includeArchived: data.includeArchived,
    });

    return { cards: rows.map((card) => this.commonFuncs.toCardResponse(card)) };
  }

  async listWorkspaceCardsByDate(
    data: ListWorkspaceCardsByDateRequest,
    user: GrpcUser,
  ): Promise<ListCardsResponse> {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.requireUUID(data.workspaceId, 'Workspace ID');

    const from = new Date(data.from);
    const to = new Date(data.to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'from and to must be valid ISO date strings',
      });
    }

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

    const rows = await this.cardFuncs.listByWorkspaceDateRange(
      data.workspaceId,
      from,
      to,
    );

    return { cards: rows.map((card) => this.commonFuncs.toCardResponse(card)) };
  }

  private requireUUID(value: string, name: string): void {
    const result = validateUUID(value, name);
    if (!result.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: result.message,
      });
    }
  }
}

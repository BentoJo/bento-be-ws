import { Injectable } from '@nestjs/common';
import { GrpcUser } from '../decorators/meta.decorator';
import { WorkspaceFuncs } from './workspace';
import { WorkspaceMembersFuncs } from './workspace-members';
import { BoardFuncs, BoardRow } from './board';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { CardRow } from './card';
import { CardResponse } from '../../modules/cards/types';

@Injectable()
export class CommonFuncs {
  async resolveBoardContext(
    data: { workspaceId: string; boardId: string },
    user: GrpcUser,
    deps: {
      workspaceFuncs: WorkspaceFuncs;
      workspaceMembers: WorkspaceMembersFuncs;
      boardFuncs: BoardFuncs;
    },
  ): Promise<{
    board: BoardRow;
    member: Awaited<ReturnType<WorkspaceMembersFuncs['getWorkspaceMember']>>;
    isBoardMember: boolean;
  }> {
    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    const workspace = await deps.workspaceFuncs.findByIdActive(
      data.workspaceId,
    );

    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    const member = await deps.workspaceMembers.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    if (!member || !member.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    const board = await deps.boardFuncs.getActiveBoard(data.boardId);

    if (!board || board.workspaceId !== data.workspaceId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Board not found',
      });
    }

    const isBoardMember = await deps.boardFuncs.isBoardMember(
      data.boardId,
      user.id,
    );

    if (board.visibility !== 'public' && !isBoardMember) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a board member',
      });
    }

    return { board, member, isBoardMember };
  }

  assertCardInBoard(
    card: CardRow | undefined,
    workspaceId: string,
    boardId: string,
  ): asserts card is CardRow {
    if (!card || card.workspaceId !== workspaceId || card.boardId !== boardId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Card not found',
      });
    }
  }

  toCardResponse(card: CardRow): CardResponse {
    return {
      id: card.id,
      workspaceId: card.workspaceId,
      boardId: card.boardId,
      columnId: card.columnId,
      title: card.title,
      descriptionText: card.descriptionText ?? null,
      startDate: card.startDate ? card.startDate.toISOString() : null,
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      priority: card.priority ?? 'medium',
      isCompleted: card.isCompleted ?? false,
      progress: card.progress ?? '0',
      isPrivate: card.isPrivate ?? false,
      position: Number(card.position),
      createdBy: card.createdBy,
      isArchived: !!card.archivedAt,
      createdAt: card.createdAt
        ? card.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: card.updatedAt ? card.updatedAt.toISOString() : null,
    };
  }
}

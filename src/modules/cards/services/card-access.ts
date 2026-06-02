import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import type { GrpcUser } from '../../../shared/decorators/meta.decorator';
import type { CardRow } from '../../../shared/func/card';
import type { BoardRow, BoardFuncs } from '../../../shared/func/board';
import type { WorkspaceFuncs } from '../../../shared/func/workspace';
import type { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import type { CardResponse } from '../types';

/**
 * Resolves and authorizes a workspace + board context for a card operation.
 * Mirrors the access checks used across the board services:
 *   1. workspace must exist & be active
 *   2. user must be an active workspace member
 *   3. board must exist, be active and belong to the workspace
 *   4. private boards require board membership
 */
export async function resolveBoardContext(
  data: { workspaceId: string; boardId: string },
  user: GrpcUser,
  deps: {
    workspaceFuncs: WorkspaceFuncs;
    workspaceMembers: WorkspaceMembersFuncs;
    boardFuncs: BoardFuncs;
  },
): Promise<{
  board: BoardRow;
  member: Awaited<
    ReturnType<WorkspaceMembersFuncs['getWorkspaceMember']>
  >;
  isBoardMember: boolean;
}> {
  if (!user?.id) {
    throw new RpcException({
      code: GrpcStatus.UNAUTHENTICATED,
      message: 'User context is required',
    });
  }

  const workspace = await deps.workspaceFuncs.findByIdActive(data.workspaceId);

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

/**
 * Loads a card and ensures it belongs to the given workspace + board.
 */
export function assertCardInBoard(
  card: CardRow | undefined,
  workspaceId: string,
  boardId: string,
): asserts card is CardRow {
  if (
    !card ||
    card.workspaceId !== workspaceId ||
    card.boardId !== boardId
  ) {
    throw new RpcException({
      code: GrpcStatus.NOT_FOUND,
      message: 'Card not found',
    });
  }
}

export function toCardResponse(card: CardRow): CardResponse {
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

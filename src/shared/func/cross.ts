import { Injectable } from '@nestjs/common';
import { GrpcUser } from '../decorators/meta.decorator';
import { WorkspaceFuncs } from './workspace';
import { WorkspaceMembersFuncs } from './workspace-members';
import { BoardFuncs, BoardRow } from './board';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@Injectable()
export class CrossService {
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
}

import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { and, desc, eq, or, sql } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { BoardFuncs } from '../../../../shared/func/board';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import { boardMembers, workspaceMembers } from '../../../../shared/db/schema';

type ListBoardMembersRequest = {
  workspaceId: string;
  boardId: string;
  page?: number;
  limit?: number;
  search?: string;
};

type ListBoardMembersResponse = {
  members: Array<{
    userId: string;
    overrideRoleId?: string | null;
    joinedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class ListBoardMembersService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
  ) {}

  async listBoardMembers(
    data: ListBoardMembersRequest,
  ): Promise<ListBoardMembersResponse> {
    this.validateInput(data);

    const page = Math.max(1, data.page ?? 1);
    const limit = Math.min(200, Math.max(1, data.limit ?? 50));

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

    const whereConditions = [
      eq(boardMembers.workspaceId, data.workspaceId),
      eq(boardMembers.boardId, data.boardId),
      eq(workspaceMembers.isActive, true),
    ];

    if (data.search) {
      const searchCondition = or(
        eq(workspaceMembers.userId, data.search),
        eq(workspaceMembers.id, data.search),
        eq(boardMembers.id, data.search),
      );

      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    const whereClause = and(...whereConditions);

    const [countRow] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(boardMembers)
      .innerJoin(
        workspaceMembers,
        eq(boardMembers.workspaceMemberId, workspaceMembers.id),
      )
      .where(whereClause);

    const total = Number(countRow?.total ?? 0);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        userId: workspaceMembers.userId,
        overrideRoleId: boardMembers.overriddenAuthzRoleId,
        joinedAt: boardMembers.joinedAt,
      })
      .from(boardMembers)
      .innerJoin(
        workspaceMembers,
        eq(boardMembers.workspaceMemberId, workspaceMembers.id),
      )
      .where(whereClause)
      .orderBy(desc(boardMembers.joinedAt))
      .limit(limit)
      .offset(offset);

    return {
      members: rows.map((row) => ({
        userId: row.userId,
        overrideRoleId: row.overrideRoleId ?? null,
        joinedAt: row.joinedAt
          ? row.joinedAt.toISOString()
          : new Date().toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
      },
    };
  }

  private validateInput(data: ListBoardMembersRequest) {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const workspaceResult = validateRequired(data.workspaceId, 'Workspace ID');
    if (!workspaceResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceResult.message,
      });
    }

    const workspaceIdResult = validateUUID(data.workspaceId, 'Workspace ID');
    if (!workspaceIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdResult.message,
      });
    }

    const boardResult = validateRequired(data.boardId, 'Board ID');
    if (!boardResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: boardResult.message,
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

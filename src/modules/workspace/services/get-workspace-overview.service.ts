import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

import { firstValueFrom } from 'rxjs';

import db from '../../../shared/configs/db.config';

import { and, eq, isNull, sql } from 'drizzle-orm';

import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { AuthzService } from '../../authz/authz.service';

import { validateUUID } from '../../../shared/validations';

import type { GrpcUser } from '../../../shared/decorators/meta.decorator';
import type {
  GetWorkspaceOverviewRequest,
  GetWorkspaceOverviewResponse,
} from '../types';

import {
  boards,
  workspaceMembers,
  workspaces,
  teams,
  boardColumns,
  cards,
} from '../../../shared/db/schema';

@Injectable()
export class GetWorkspaceOverviewService {
  private readonly logger = new Logger(GetWorkspaceOverviewService.name);

  constructor(
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async getOverview(
    data: GetWorkspaceOverviewRequest,
    user: GrpcUser,
  ): Promise<GetWorkspaceOverviewResponse> {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const workspaceIdValidation = validateUUID(
      data.workspaceId,
      'Workspace ID',
    );

    if (!workspaceIdValidation.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdValidation.message,
      });
    }

    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    const [workspaceRow] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        logoUrl: workspaces.logoUrl,
        ownerUserId: workspaces.ownerUserId,
        createdAt: workspaces.createdAt,
      })
      .from(workspaces)
      .where(
        and(eq(workspaces.id, data.workspaceId), isNull(workspaces.deletedAt)),
      )
      .limit(1);

    if (!workspaceRow) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    const workspaceId = workspaceRow.id;

    const member = await this.workspaceMembers.getWorkspaceMember(
      workspaceId,
      user.id,
    );

    if (!member || !member.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    const membersCountQ = db
      .select({ total: sql<number>`COUNT(*)` })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.isActive, true),
        ),
      );
    console.log(membersCountQ);

    const teamsCountQ = db
      .select({ total: sql<number>`COUNT(*)` })
      .from(teams)
      .where(and(eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)));

    const boardsCountQ = db
      .select({ total: sql<number>`COUNT(*)` })
      .from(boards)
      .where(
        and(eq(boards.workspaceId, workspaceId), isNull(boards.deletedAt)),
      );

    const cardsSummaryQ = db
      .select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`
          COUNT(*) FILTER (WHERE ${cards.isCompleted} = true)
        `,
        overdue: sql<number>`
          COUNT(*) FILTER (
            WHERE ${cards.dueDate} < NOW()
            AND ${cards.isCompleted} = false
          )
        `,
      })
      .from(cards)
      .where(and(eq(cards.workspaceId, workspaceId), isNull(cards.deletedAt)));

    const boardsPreviewRows = await db
      .select({
        id: boards.id,
        name: boards.name,
        visibility: boards.visibility,
      })
      .from(boards)
      .where(and(eq(boards.workspaceId, workspaceId), isNull(boards.deletedAt)))
      .orderBy(boards.position)
      .limit(5);

    const [membersCountRes, teamsCountRes, boardsCountRes, cardsSummaryRes] =
      await Promise.all([
        membersCountQ,
        teamsCountQ,
        boardsCountQ,
        cardsSummaryQ,
      ]);

    const membersCount = Number(membersCountRes[0]?.total ?? 0);
    const teamsCount = Number(teamsCountRes[0]?.total ?? 0);
    const boardsCount = Number(boardsCountRes[0]?.total ?? 0);

    const cardsSummary = cardsSummaryRes[0] ?? {
      total: 0,
      completed: 0,
      overdue: 0,
    };

    const roleId = member.authzRoleId;

    let permissions = {
      canCreateBoard: false,
      canInviteMembers: false,
      canEditWorkspace: false,
    };

    try {
      const permissionsResult = await firstValueFrom(
        this.authZ.batchCheckPermissions({
          roleId,
          scopeId: workspaceId,
          permissions: [
            'workspace:boards:manage',
            'workspace:members:manage',
            'workspace:workspace:manage',
          ],
        }),
      );

      const results = permissionsResult.results ?? {};

      permissions = {
        canCreateBoard: !!results['workspace:boards:manage'],
        canInviteMembers: !!results['workspace:members:manage'],
        canEditWorkspace: !!results['workspace:workspace:manage'],
      };
    } catch (error) {
      this.logger.warn(
        `AuthZ batch permission check failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }

    const boardsPreview = await Promise.all(
      boardsPreviewRows.map(async (board) => {
        const [columnsCount] = await db
          .select({ total: sql<number>`COUNT(*)` })
          .from(boardColumns)
          .where(
            and(
              eq(boardColumns.boardId, board.id),
              isNull(boardColumns.deletedAt),
            ),
          );

        const [cardsCount] = await db
          .select({ total: sql<number>`COUNT(*)` })
          .from(cards)
          .where(and(eq(cards.boardId, board.id), isNull(cards.deletedAt)));

        return {
          id: board.id,
          name: board.name,
          visibility: board.visibility ?? 'private',
          columnsCount: Number(columnsCount?.total ?? 0),
          cardCount: Number(cardsCount?.total ?? 0),
        };
      }),
    );

    this.logger.log(
      'OVERVIEW RESULT',
      JSON.stringify({
        membersCount,
        boardsCount,
        teamsCount,
        cardsSummary,
      }),
    );
    return {
      totalBoards: boardsCount,
      totalMembers: membersCount,
      totalTeams: teamsCount,

      totalCards: Number(cardsSummary.total ?? 0),
      completedCards: Number(cardsSummary.completed ?? 0),
      overdueCards: Number(cardsSummary.overdue ?? 0),

      boardsPreview,

      permissions,

      lastUpdatedAt: new Date().toISOString(),
    };
  }
}

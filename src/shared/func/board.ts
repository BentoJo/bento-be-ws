import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  boardFavorites,
  boardMembers,
  boards,
  workspaceMembers,
} from '../db/schema';
import db from '../configs/db.config';
import { BoardVisibility } from '../../modules/boards/board/types';

type DB = NodePgDatabase;

export interface BoardRow {
  id: string;
  workspaceId: string;
  name: string;
  icon: string | null;
  visibility: BoardVisibility;
  createdBy: string;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

@Injectable()
export class BoardFuncs {
  async isBoardMember(boardId: string, userId: string, tx?: DB) {
    const client = tx || db;
    const [row] = await client
      .select({ id: boardMembers.id })
      .from(boardMembers)
      .innerJoin(
        workspaceMembers,
        eq(boardMembers.workspaceMemberId, workspaceMembers.id),
      )
      .where(
        and(
          eq(boardMembers.boardId, boardId),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.isActive, true),
        ),
      )
      .limit(1);

    return !!row;
  }

  async addBoardMember(
    data: {
      boardId: string;
      workspaceMemberId: string;
      workspaceId: string;
    },
    tx?: DB,
  ) {
    const client = tx || db;
    const [existing] = await client
      .select({ id: boardMembers.id })
      .from(boardMembers)
      .where(
        and(
          eq(boardMembers.boardId, data.boardId),
          eq(boardMembers.workspaceMemberId, data.workspaceMemberId),
        ),
      )
      .limit(1);

    if (existing) {
      return;
    }

    const [newMember] = await client
      .insert(boardMembers)
      .values({
        boardId: data.boardId,
        workspaceMemberId: data.workspaceMemberId,
        workspaceId: data.workspaceId,
        joinedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    return newMember;
  }

  async favoriteBoard(
    data: {
      workspaceId: string;
      boardId: string;
      workspaceMemberId: string;
    },
    tx?: DB,
  ) {
    const client = tx || db;

    const [existing] = await client
      .select({ id: boardFavorites.id })
      .from(boardFavorites)
      .where(
        and(
          eq(boardFavorites.boardId, data.boardId),
          eq(boardFavorites.workspaceMemberId, data.workspaceMemberId),
        ),
      )
      .limit(1);

    if (existing) {
      return;
    }

    await client.insert(boardFavorites).values({
      workspaceId: data.workspaceId,
      boardId: data.boardId,
      workspaceMemberId: data.workspaceMemberId,
    });
  }

  async listFavoriteBoards(
    data: {
      workspaceId: string;
      workspaceMemberId: string;
      page: number;
      limit: number;
    },
    tx?: DB,
  ) {
    const client = tx || db;
    const offset = (data.page - 1) * data.limit;

    const whereClause = and(
      eq(boardFavorites.workspaceId, data.workspaceId),
      eq(boardFavorites.workspaceMemberId, data.workspaceMemberId),
      isNull(boards.deletedAt),
      isNull(boards.archivedAt),
    );

    const [countRow] = await client
      .select({ total: sql<number>`COUNT(*)` })
      .from(boardFavorites)
      .innerJoin(boards, eq(boardFavorites.boardId, boards.id))
      .where(whereClause);

    const total = Number(countRow?.total ?? 0);

    const rows = await client
      .select({
        boardId: boards.id,
        name: boards.name,
        icon: boards.icon,
        visibility: boards.visibility,
      })
      .from(boardFavorites)
      .innerJoin(boards, eq(boardFavorites.boardId, boards.id))
      .where(whereClause)
      .orderBy(desc(boardFavorites.createdAt))
      .limit(data.limit)
      .offset(offset);

    return {
      rows,
      total,
    };
  }

  async unfavoriteBoard(
    data: {
      boardId: string;
      workspaceMemberId: string;
    },
    tx?: DB,
  ) {
    const client = tx || db;

    await client
      .delete(boardFavorites)
      .where(
        and(
          eq(boardFavorites.boardId, data.boardId),
          eq(boardFavorites.workspaceMemberId, data.workspaceMemberId),
        ),
      );
  }

  async archiveBoard(id: string, tx?: DB): Promise<BoardRow> {
    const row = await this.update(id, { archivedAt: new Date() }, tx);

    if (!row) {
      throw new Error('Failed to archive board');
    }

    return row;
  }

  async unarchiveBoard(id: string, tx?: DB): Promise<BoardRow> {
    const row = await this.update(id, { archivedAt: null }, tx);

    if (!row) {
      throw new Error('Failed to unarchive board');
    }

    return row;
  }

  async getById(id: string, tx?: DB) {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(boards)
      .where(eq(boards.id, id))
      .limit(1);

    return row as BoardRow | undefined;
  }

  async getActiveBoard(id: string, tx?: DB) {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(boards)
      .where(and(eq(boards.id, id), isNull(boards.deletedAt)))
      .limit(1);

    return row as BoardRow | undefined;
  }

  async list(
    workspaceId: string,
    access?: {
      isMember?: boolean;
      canViewAll?: boolean;
    },
    tx?: DB,
  ) {
    const client = tx || db;
    const canViewPrivateBoards = access?.canViewAll || access?.isMember;

    const conditions = [
      eq(boards.workspaceId, workspaceId),
      isNull(boards.deletedAt),
      isNull(boards.archivedAt),
    ];

    if (!canViewPrivateBoards) {
      conditions.push(eq(boards.visibility, 'public'));
    }

    return client
      .select()
      .from(boards)
      .where(and(...conditions))
      .orderBy(boards.createdAt) as Promise<BoardRow[]>;
  }

  async create(
    data: {
      workspaceId: string;
      name: string;
      icon?: string | null;
      visibility?: BoardVisibility;
      createdBy: string;
    },
    tx?: DB,
  ) {
    const client = tx || db;

    const [row] = await client
      .insert(boards)
      .values([
        {
          workspaceId: data.workspaceId,
          name: data.name,
          icon: data.icon ?? null,
          visibility: data.visibility ?? 'public',
          createdBy: data.createdBy,
        },
      ])
      .returning();

    return row as BoardRow;
  }

  async update(
    id: string,
    patch: Partial<{
      name: string;
      icon: string | null;
      visibility: BoardVisibility;
      archivedAt: Date | null;
      deletedAt: Date | null;
    }>,
    tx?: DB,
  ) {
    const client = tx || db;
    const updateObj: Partial<typeof boards.$inferInsert> = {};

    if (patch.name !== undefined) updateObj.name = patch.name;
    if (patch.icon !== undefined) updateObj.icon = patch.icon;
    if (patch.visibility !== undefined) updateObj.visibility = patch.visibility;
    if (patch.archivedAt !== undefined) updateObj.archivedAt = patch.archivedAt;
    if (patch.deletedAt !== undefined) updateObj.deletedAt = patch.deletedAt;

    updateObj.updatedAt = new Date();

    const [row] = await client
      .update(boards)
      .set(updateObj)
      .where(eq(boards.id, id))
      .returning();

    return row as BoardRow | undefined;
  }
}

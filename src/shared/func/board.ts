import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { boardMembers, boards, workspaceMembers } from '../db/schema';
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
          id: randomUUID(),
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

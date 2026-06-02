import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { boardColumns, cards } from '../db/schema';
import db from '../configs/db.config';

type DB = NodePgDatabase;

export interface ColumnRow {
  id: string;
  workspaceId: string;
  boardId: string;
  name: string;
  position: string;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

@Injectable()
export class ColumnFuncs {
  async getById(id: string, tx?: DB) {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(boardColumns)
      .where(eq(boardColumns.id, id))
      .limit(1);

    return row as ColumnRow | undefined;
  }

  async getActiveColumn(id: string, tx?: DB) {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(boardColumns)
      .where(and(eq(boardColumns.id, id), isNull(boardColumns.deletedAt)))
      .limit(1);

    return row as ColumnRow | undefined;
  }

  async getMaxPosition(boardId: string, tx?: DB): Promise<number> {
    const client = tx || db;
    const [row] = await client
      .select({ max: sql<string | null>`MAX(${boardColumns.position})` })
      .from(boardColumns)
      .where(
        and(eq(boardColumns.boardId, boardId), isNull(boardColumns.deletedAt)),
      );

    return row?.max != null ? Number(row.max) : 0;
  }

  async create(
    data: {
      workspaceId: string;
      boardId: string;
      name: string;
      position: number;
    },
    tx?: DB,
  ) {
    const client = tx || db;

    const [row] = await client
      .insert(boardColumns)
      .values([
        {
          id: randomUUID(),
          workspaceId: data.workspaceId,
          boardId: data.boardId,
          name: data.name,
          position: data.position.toString(),
        },
      ])
      .returning();

    return row as ColumnRow;
  }

  async update(
    id: string,
    patch: Partial<{
      name: string;
      position: number;
      archivedAt: Date | null;
      deletedAt: Date | null;
    }>,
    tx?: DB,
  ) {
    const client = tx || db;
    const updateObj: Partial<typeof boardColumns.$inferInsert> = {};

    if (patch.name !== undefined) updateObj.name = patch.name;
    if (patch.position !== undefined)
      updateObj.position = patch.position.toString();
    if (patch.archivedAt !== undefined) updateObj.archivedAt = patch.archivedAt;
    if (patch.deletedAt !== undefined) updateObj.deletedAt = patch.deletedAt;

    updateObj.updatedAt = new Date();

    const [row] = await client
      .update(boardColumns)
      .set(updateObj)
      .where(eq(boardColumns.id, id))
      .returning();

    return row as ColumnRow | undefined;
  }

  async listByBoard(
    boardId: string,
    opts?: { includeArchived?: boolean },
    tx?: DB,
  ): Promise<ColumnRow[]> {
    const client = tx || db;

    const conditions = [
      eq(boardColumns.boardId, boardId),
      isNull(boardColumns.deletedAt),
    ];

    if (!opts?.includeArchived) {
      conditions.push(isNull(boardColumns.archivedAt));
    }

    return client
      .select()
      .from(boardColumns)
      .where(and(...conditions))
      .orderBy(asc(boardColumns.position)) as Promise<ColumnRow[]>;
  }

  async countActiveCards(columnId: string, tx?: DB): Promise<number> {
    const client = tx || db;
    const [row] = await client
      .select({ total: sql<number>`COUNT(*)` })
      .from(cards)
      .where(and(eq(cards.columnId, columnId), isNull(cards.deletedAt)));

    return Number(row?.total ?? 0);
  }

  /**
   * Reorder a single column to a new 1-based position within its board.
   * Sibling columns are shifted up/down so positions stay contiguous.
   */
  async reorder(
    data: { boardId: string; columnId: string; newPosition: number },
    tx?: DB,
  ): Promise<void> {
    const client = tx || db;

    const run = async (trx: DB) => {
      const siblings = (await trx
        .select()
        .from(boardColumns)
        .where(
          and(
            eq(boardColumns.boardId, data.boardId),
            isNull(boardColumns.deletedAt),
          ),
        )
        .orderBy(asc(boardColumns.position))) as ColumnRow[];

      const current = siblings.find((c) => c.id === data.columnId);
      if (!current) {
        return;
      }

      const ordered = siblings.filter((c) => c.id !== data.columnId);
      const target = Math.max(
        0,
        Math.min(data.newPosition - 1, ordered.length),
      );
      ordered.splice(target, 0, current);

      for (let i = 0; i < ordered.length; i++) {
        const desired = i + 1;
        if (Number(ordered[i].position) !== desired) {
          await trx
            .update(boardColumns)
            .set({ position: desired.toString(), updatedAt: new Date() })
            .where(eq(boardColumns.id, ordered[i].id));
        }
      }
    };

    if (tx) {
      await run(tx);
    } else {
      await db.transaction(async (trx) => run(trx as unknown as DB));
    }
  }

  /**
   * Apply explicit positions to a set of columns belonging to a board.
   */
  async bulkReorder(
    data: {
      boardId: string;
      columns: { columnId: string; position: number }[];
    },
    tx?: DB,
  ): Promise<void> {
    const run = async (trx: DB) => {
      for (const item of data.columns) {
        await trx
          .update(boardColumns)
          .set({ position: item.position.toString(), updatedAt: new Date() })
          .where(
            and(
              eq(boardColumns.id, item.columnId),
              eq(boardColumns.boardId, data.boardId),
              isNull(boardColumns.deletedAt),
            ),
          );
      }
    };

    if (tx) {
      await run(tx);
    } else {
      await db.transaction(async (trx) => run(trx as unknown as DB));
    }
  }

  async listCards(
    columnId: string,
    opts: { page: number; limit: number },
    tx?: DB,
  ) {
    const client = tx || db;
    const offset = (opts.page - 1) * opts.limit;

    const whereClause = and(
      eq(cards.columnId, columnId),
      isNull(cards.deletedAt),
    );

    const [countRow] = await client
      .select({ total: sql<number>`COUNT(*)` })
      .from(cards)
      .where(whereClause);

    const total = Number(countRow?.total ?? 0);

    const rows = await client
      .select({
        cardId: cards.id,
        title: cards.title,
        position: cards.position,
        isCompleted: cards.isCompleted,
        dueDate: cards.dueDate,
      })
      .from(cards)
      .where(whereClause)
      .orderBy(asc(cards.position))
      .limit(opts.limit)
      .offset(offset);

    return { rows, total };
  }

  /**
   * Move the given cards from one column to another within the same board.
   * Moved cards are appended after the current max position of the target column.
   */
  async moveCards(
    data: {
      boardId: string;
      sourceColumnId: string;
      targetColumnId: string;
      cardIds: string[];
    },
    tx?: DB,
  ): Promise<number> {
    const run = async (trx: DB) => {
      const [maxRow] = await trx
        .select({ max: sql<string | null>`MAX(${cards.position})` })
        .from(cards)
        .where(
          and(
            eq(cards.columnId, data.targetColumnId),
            isNull(cards.deletedAt),
          ),
        );

      let nextPosition = maxRow?.max != null ? Number(maxRow.max) : 0;
      let moved = 0;

      for (const cardId of data.cardIds) {
        nextPosition += 1;
        const updated = await trx
          .update(cards)
          .set({
            columnId: data.targetColumnId,
            position: nextPosition.toString(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(cards.id, cardId),
              eq(cards.columnId, data.sourceColumnId),
              eq(cards.boardId, data.boardId),
              isNull(cards.deletedAt),
            ),
          )
          .returning({ id: cards.id });

        if (updated.length > 0) {
          moved += 1;
        }
      }

      return moved;
    };

    if (tx) {
      return run(tx);
    }
    return db.transaction(async (trx) => run(trx as unknown as DB));
  }
}

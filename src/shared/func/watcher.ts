import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { watchers, workspaceMembers } from '../db/schema';
import db from '../configs/db.config';

type DB = NodePgDatabase;

export type WatchableType = 'board' | 'column' | 'card';

@Injectable()
export class WatcherFuncs {
  async watch(
    data: {
      workspaceId: string;
      workspaceMemberId: string;
      watchableId: string;
      watchableType: WatchableType;
    },
    tx?: DB,
  ) {
    const client = tx || db;

    const [existing] = await client
      .select({ id: watchers.id })
      .from(watchers)
      .where(
        and(
          eq(watchers.workspaceMemberId, data.workspaceMemberId),
          eq(watchers.watchableId, data.watchableId),
          eq(watchers.watchableType, data.watchableType),
        ),
      )
      .limit(1);

    if (existing) {
      return;
    }

    await client.insert(watchers).values({
      workspaceId: data.workspaceId,
      workspaceMemberId: data.workspaceMemberId,
      watchableId: data.watchableId,
      watchableType: data.watchableType,
    });
  }

  async unwatch(
    data: {
      workspaceMemberId: string;
      watchableId: string;
      watchableType: WatchableType;
    },
    tx?: DB,
  ) {
    const client = tx || db;

    await client
      .delete(watchers)
      .where(
        and(
          eq(watchers.workspaceMemberId, data.workspaceMemberId),
          eq(watchers.watchableId, data.watchableId),
          eq(watchers.watchableType, data.watchableType),
        ),
      );
  }

  async list(
    data: {
      watchableId: string;
      watchableType: WatchableType;
      page: number;
      limit: number;
    },
    tx?: DB,
  ) {
    const client = tx || db;
    const offset = (data.page - 1) * data.limit;

    const whereClause = and(
      eq(watchers.watchableId, data.watchableId),
      eq(watchers.watchableType, data.watchableType),
    );

    const [countRow] = await client
      .select({ total: sql<number>`COUNT(*)` })
      .from(watchers)
      .where(whereClause);

    const total = Number(countRow?.total ?? 0);

    const rows = await client
      .select({
        userId: workspaceMembers.userId,
        watchedAt: watchers.createdAt,
      })
      .from(watchers)
      .innerJoin(
        workspaceMembers,
        eq(watchers.workspaceMemberId, workspaceMembers.id),
      )
      .where(whereClause)
      .orderBy(desc(watchers.createdAt))
      .limit(data.limit)
      .offset(offset);

    return { rows, total };
  }
}

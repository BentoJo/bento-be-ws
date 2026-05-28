import { Injectable } from '@nestjs/common';
import db from '../configs/db.config';
import { workspaces } from '../db/modules/workspace';
import { eq, isNull, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

type DB = NodePgDatabase;

export interface WorkspaceRow {
  id: string;
  name: string;
  logoUrl: string | null;
  logoKey: string | null;
  ownerUserId: string;
  createdBy: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}
@Injectable()
export class WorkspaceFuncs {
  async create(
    data: {
      name: string;
      ownerUserId: string;
      createdBy?: string;
      logoUrl?: string | null;
      logoKey?: string | null;
    },
    tx?: DB,
  ) {
    const [row] = await (tx || db)
      .insert(workspaces)
      .values({
        name: data.name,
        ownerUserId: data.ownerUserId,
        createdBy: data.createdBy ?? data.ownerUserId,
        logoUrl: data.logoUrl ?? null,
        logoKey: data.logoKey ?? null,
        deletedAt: null,
      })
      .returning();

    return row;
  }

  async findById(id: string) {
    const [row] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);
    return row;
  }

  async findByIdActive(id: string) {
    const [row] = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, id), eq(isNull(workspaces.deletedAt), true)))
      .limit(1);
    return row;
  }

  // async listByOwner(
  //   ownerUserId: string,
  //   opts?: { limit?: number; offset?: number },
  // ) {
  //   let q = db
  //     .select()
  //     .from(workspaces)
  //     .where(eq(workspaces.ownerUserId, ownerUserId));
  //   if (opts?.limit) q = q.limit(opts.limit);
  //   if (opts?.offset) q = q.offset(opts.offset);
  //   const rows = await q;
  //   return rows.map(mapRow);
  // },

  // async list(opts?: {
  //   includeDeleted?: boolean;
  //   limit?: number;
  //   offset?: number;
  // }) {
  //   let q = db.select().from(workspaces);
  //   if (!opts?.includeDeleted)
  //     q = q.where(eq(workspaces.deletedAt, null as any));
  //   if (opts?.limit) q = q.limit(opts.limit);
  //   if (opts?.offset) q = q.offset(opts.offset);
  //   const rows = await q;
  //   return rows.map(mapRow);
  // },

  // async update(
  //   id: string,
  //   patch: Partial<{
  //     name: string;
  //     logoUrl: string | null;
  //     logoKey: string | null;
  //     ownerUserId: string;
  //   }>,
  // ) {
  //   const updateObj: any = {};
  //   if (patch.name !== undefined) updateObj.name = patch.name;
  //   if (patch.logoUrl !== undefined) updateObj.logoUrl = patch.logoUrl;
  //   if (patch.logoKey !== undefined) updateObj.logoKey = patch.logoKey;
  //   if (patch.ownerUserId !== undefined)
  //     updateObj.ownerUserId = patch.ownerUserId;
  //   updateObj.updatedAt = new Date();

  //   const [row] = await db
  //     .update(workspaces)
  //     .set(updateObj)
  //     .where(eq(workspaces.id, id))
  //     .returning('*');

  //   return mapRow(row);
  // },

  // async softDelete(id: string) {
  //   const [row] = await db
  //     .update(workspaces)
  //     .set({ deletedAt: new Date(), updatedAt: new Date() })
  //     .where(eq(workspaces.id, id))
  //     .returning('*');
  //   return mapRow(row);
  // },

  // async restore(id: string) {
  //   const [row] = await db
  //     .update(workspaces)
  //     .set({ deletedAt: null as any, updatedAt: new Date() })
  //     .where(eq(workspaces.id, id))
  //     .returning('*');
  //   return mapRow(row);
  // },

  // async transferOwnership(id: string, newOwnerUserId: string) {
  //   const [row] = await db
  //     .update(workspaces)
  //     .set({ ownerUserId: newOwnerUserId, updatedAt: new Date() })
  //     .where(eq(workspaces.id, id))
  //     .returning();
  //   return mapRow(row);
  // },

  // async countByOwner(ownerUserId: string) {
  //   const rows = await db
  //     .select()
  //     .from(workspaces)
  //     .where(eq(workspaces.ownerUserId, ownerUserId));
  //   return rows.length;
  // },
}

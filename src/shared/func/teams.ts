import { Injectable } from '@nestjs/common';
import { and, eq, ilike, isNull, count, desc, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import db from '../configs/db.config';
import { teamMembers, teams, workspaceMembers } from '../db/schema';

type DB = NodePgDatabase;

@Injectable()
export class TeamsFuncs {
  async create(
    data: {
      workspaceId: string;
      name: string;
      description?: string | null;
      icon?: string | null;
      createdBy: string;
    },
    tx?: DB,
  ) {
    const [row] = await (tx || db)
      .insert(teams)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? null,
        createdBy: data.createdBy,
        archivedAt: null,
        deletedAt: null,
      })
      .returning();

    return row;
  }

  async findByWorkspaceIdAndNameActive(workspaceId: string, name: string) {
    const [row] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.workspaceId, workspaceId),
          ilike(teams.name, name),
          isNull(teams.deletedAt),
        ),
      )
      .limit(1);

    return row;
  }

  async findByIdAndWorkspaceActive(teamId: string, workspaceId: string) {
    const [row] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.id, teamId),
          eq(teams.workspaceId, workspaceId),
          isNull(teams.deletedAt),
        ),
      )
      .limit(1);

    return row;
  }

  async findByIdAndWorkspace(teamId: string, workspaceId: string) {
    const [row] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.workspaceId, workspaceId)))
      .limit(1);

    return row;
  }

  async findByWorkspaceIdAndNameActiveExcludingId(
    workspaceId: string,
    name: string,
    excludedTeamId: string,
  ) {
    const rows = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.workspaceId, workspaceId),
          ilike(teams.name, name),
          isNull(teams.deletedAt),
        ),
      )
      .limit(5);

    return rows.find((row) => row.id !== excludedTeamId);
  }

  async update(
    teamId: string,
    patch: Partial<{
      name: string;
      description: string | null;
      icon: string | null;
    }>,
    tx?: DB,
  ) {
    const updateObj: Partial<typeof teams.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (patch.name !== undefined) {
      updateObj.name = patch.name;
    }

    if (patch.description !== undefined) {
      updateObj.description = patch.description;
    }

    if (patch.icon !== undefined) {
      updateObj.icon = patch.icon;
    }

    const [row] = await (tx || db)
      .update(teams)
      .set(updateObj)
      .where(eq(teams.id, teamId))
      .returning();

    return row;
  }

  async softDelete(teamId: string, tx?: DB) {
    const now = new Date();

    const [row] = await (tx || db)
      .update(teams)
      .set({
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(teams.id, teamId))
      .returning();

    return row;
  }

  async restore(teamId: string, tx?: DB) {
    const now = new Date();

    const [row] = await (tx || db)
      .update(teams)
      .set({
        deletedAt: null,
        updatedAt: now,
      })
      .where(eq(teams.id, teamId))
      .returning();

    return row;
  }

  async unarchive(teamId: string, tx?: DB) {
    const now = new Date();

    const [row] = await (tx || db)
      .update(teams)
      .set({
        archivedAt: null,
        updatedAt: now,
      })
      .where(eq(teams.id, teamId))
      .returning();

    return row;
  }

  async findByWorkspaceIdAndNameActiveNotArchivedExcludingId(
    workspaceId: string,
    name: string,
    excludedTeamId: string,
  ) {
    const rows = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.workspaceId, workspaceId),
          ilike(teams.name, name),
          isNull(teams.deletedAt),
          isNull(teams.archivedAt),
        ),
      )
      .limit(5);

    return rows.find((row) => row.id !== excludedTeamId);
  }

  async findTeamMember(teamId: string, workspaceMemberId: string) {
    const [row] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.workspaceMemberId, workspaceMemberId),
        ),
      )
      .limit(1);

    return row;
  }

  async addTeamMember(
    data: {
      workspaceId: string;
      teamId: string;
      workspaceMemberId: string;
    },
    tx?: DB,
  ) {
    const [row] = await (tx || db)
      .insert(teamMembers)
      .values({
        workspaceId: data.workspaceId,
        teamId: data.teamId,
        workspaceMemberId: data.workspaceMemberId,
      })
      .returning();

    return row;
  }

  async addTeamMembers(
    rows: Array<{
      workspaceId: string;
      teamId: string;
      workspaceMemberId: string;
    }>,
    tx?: DB,
  ) {
    if (rows.length === 0) {
      return [];
    }

    const inserted = await (tx || db)
      .insert(teamMembers)
      .values(rows)
      .returning();

    return inserted;
  }

  async archive(teamId: string, tx?: DB) {
    const now = new Date();

    const [row] = await (tx || db)
      .update(teams)
      .set({
        archivedAt: now,
        updatedAt: now,
      })
      .where(eq(teams.id, teamId))
      .returning();

    return row;
  }

  async findByIdAndWorkspaceNotArchived(teamId: string, workspaceId: string) {
    const [row] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.id, teamId),
          eq(teams.workspaceId, workspaceId),
          isNull(teams.archivedAt),
          isNull(teams.deletedAt),
        ),
      )
      .limit(1);

    return row;
  }

  async removeTeamMember(teamId: string, workspaceMemberId: string, tx?: DB) {
    const result = await (tx || db)
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.workspaceMemberId, workspaceMemberId),
        ),
      )
      .returning();

    return result;
  }

  async removeTeamMembers(
    teamId: string,
    workspaceMemberIds: string[],
    tx?: DB,
  ) {
    if (workspaceMemberIds.length === 0) {
      return [];
    }

    const result = await (tx || db)
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          inArray(teamMembers.workspaceMemberId, workspaceMemberIds),
        ),
      )
      .returning();

    return result;
  }

  async findTeamMembersPaginated(
    teamId: string,
    limit: number,
    offset: number,
  ) {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(desc(teamMembers.joinedAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async countTeamMembers(teamId: string) {
    const result = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    return result[0]?.count || 0;
  }

  async findByWorkspaceIdPaginated(
    workspaceId: string,
    limit: number,
    offset: number,
    search?: string,
  ) {
    const conditions = [
      eq(teams.workspaceId, workspaceId),
      isNull(teams.deletedAt),
    ];

    if (search) {
      conditions.push(ilike(teams.name, `%${search}%`));
    }

    const rows = await db
      .select()
      .from(teams)
      .where(and(...conditions))
      .orderBy(desc(teams.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async countTeamsByWorkspace(workspaceId: string, search?: string) {
    const conditions = [
      eq(teams.workspaceId, workspaceId),
      isNull(teams.deletedAt),
    ];

    if (search) {
      conditions.push(ilike(teams.name, `%${search}%`));
    }

    const result = await db
      .select({ count: count() })
      .from(teams)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  async findMemberTeams(workspaceId: string, userId: string, tx?: DB) {
    const rows = await (tx || db)
      .select({
        teamId: teams.id,
        name: teams.name,
        icon: teams.icon,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .innerJoin(
        workspaceMembers,
        eq(teamMembers.workspaceMemberId, workspaceMembers.id),
      )
      .where(
        and(
          eq(teamMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.isActive, true),
          isNull(teams.deletedAt),
        ),
      )
      .orderBy(desc(teamMembers.joinedAt));

    return rows;
  }

  async findTeamMembersByWorkspaceMemberIds(
    teamId: string,
    workspaceMemberIds: string[],
    tx?: DB,
  ) {
    if (workspaceMemberIds.length === 0) {
      return [];
    }

    const rows = await (tx || db)
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          inArray(teamMembers.workspaceMemberId, workspaceMemberIds),
        ),
      );

    return rows;
  }
}

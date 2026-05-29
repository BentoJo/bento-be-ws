import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import db from '../configs/db.config';
import { workspaceMembers } from '../db/modules/workspace';

export interface CheckWorkspaceMemberInput {
  workspaceId: string;
  userId: string;
}

type DB = NodePgDatabase;

@Injectable()
export class WorkspaceMembersFuncs {
  async checkWorkspaceMember(input: CheckWorkspaceMemberInput) {
    const filters = [
      eq(workspaceMembers.workspaceId, input.workspaceId),
      eq(workspaceMembers.userId, input.userId),
      eq(workspaceMembers.isActive, true),
    ];

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(and(...filters))
      .limit(1);

    return member;
  }

  async getWorkspaceMember(workspaceId: string, userId: string, tx?: DB) {
    const [member] = await (tx || db)
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);

    return member;
  }
}

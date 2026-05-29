import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import db from '../configs/db.config';
import { workspaceMembers } from '../db/modules/workspace';

export interface CheckWorkspaceMemberInput {
  workspaceId: string;
  userId: string;
}

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
}

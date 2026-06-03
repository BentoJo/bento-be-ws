import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { and, eq, sql } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { AuthzService } from '../../../authz/authz.service';
import { IamService } from '../../../iam/iam.service';
import { validateUUID } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type {
  ListWorkspaceMembersRequest,
  ListWorkspaceMembersResponse,
  WorkspaceMemberListItem,
} from '../types';
import { workspaceMembers } from '../../../../shared/db/schema';

@Injectable()
export class ListWorkspaceMembersService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
    private readonly iam: IamService,
  ) {}

  async listWorkspaceMembers(
    data: ListWorkspaceMembersRequest,
    user: GrpcUser,
  ): Promise<ListWorkspaceMembersResponse> {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const workspaceIdResult = validateUUID(data.workspaceId, 'Workspace ID');
    if (!workspaceIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdResult.message,
      });
    }

    const page = Math.max(1, data.page ?? 1);
    const limit = Math.min(200, Math.max(1, data.limit ?? 50));

    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    const workspace = await this.workspaceFuncs.findByIdActive(
      data.workspaceId,
    );
    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    const requesterMember = await this.workspaceMembers.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    if (!requesterMember || !requesterMember.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    const permission = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: requesterMember.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:members:read',
      }),
    );

    if (!permission?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const whereClause = and(
      eq(workspaceMembers.workspaceId, data.workspaceId),
      eq(workspaceMembers.isActive, true),
    );

    // total count
    const [countRow] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(workspaceMembers)
      .where(whereClause);

    const total = Number(countRow?.total ?? 0);

    const offset = (page - 1) * limit;

    let q = db
      .select()
      .from(workspaceMembers)
      .where(whereClause)
      .orderBy(workspaceMembers.joinedAt)
      .limit(limit)
      .offset(offset);

    // simple search: match userId exactly if provided
    if (data.search) {
      q = db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, data.workspaceId),
            eq(workspaceMembers.isActive, true),
            eq(workspaceMembers.userId, data.search),
          ),
        )
        .orderBy(workspaceMembers.joinedAt)
        .limit(limit)
        .offset(offset);
    }

    const rows = await q;

    const userIds = Array.from(
      new Set(rows.map((m) => m.userId).filter((id) => !!id)),
    );

    const iamUsers =
      userIds.length > 0
        ? await firstValueFrom(this.iam.getUsersByIds({ userIds }))
        : { users: [] };

    const usersById = new Map((iamUsers.users ?? []).map((u) => [u.id, u]));

    const members: WorkspaceMemberListItem[] = rows.map((m) => ({
      id: m.id,
      userId: m.userId,
      authzRoleId: m.authzRoleId,
      joinedAt: (m.joinedAt as Date).toISOString(),
      user: usersById.get(m.userId)
        ? {
            id: usersById.get(m.userId)!.id,
            email: usersById.get(m.userId)!.email,
            firstName: usersById.get(m.userId)!.firstName,
            lastName: usersById.get(m.userId)!.lastName,
            avatarUrl: usersById.get(m.userId)!.avatarUrl || null,
          }
        : undefined,
    }));

    const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

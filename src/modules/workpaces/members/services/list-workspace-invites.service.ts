import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { and, eq, sql } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { AuthzService } from '../../../authz/authz.service';
import { validateUUID } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type {
  ListWorkspaceInvitesRequest,
  ListWorkspaceInvitesResponse,
  WorkspaceInviteListItem,
} from '../types';
import {
  workspaceInvites,
  workspaceMembers,
} from '../../../../shared/db/schema';

@Injectable()
export class ListWorkspaceInvitesService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async listWorkspaceInvites(
    data: ListWorkspaceInvitesRequest,
    user: GrpcUser,
  ): Promise<ListWorkspaceInvitesResponse> {
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

    const member = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, data.workspaceId),
          eq(workspaceMembers.userId, user.id),
          eq(workspaceMembers.isActive, true),
        ),
      )
      .limit(1);

    // we check authZ permission directly (assume caller is authenticated and has role id in metadata in other flows)
    const permission = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: member?.[0]?.authzRoleId ?? '',
        scopeId: data.workspaceId,
        permission: 'workspace:invitations:manage',
      }),
    );

    if (!permission?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    // build where
    const whereClause = eq(workspaceInvites.workspaceId, data.workspaceId);

    // count
    const [countRow] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(workspaceInvites)
      .where(whereClause);

    const total = Number(countRow?.total ?? 0);
    const offset = (page - 1) * limit;

    let q = db
      .select()
      .from(workspaceInvites)
      .where(whereClause)
      .orderBy(sql`workspace_invites.created_at DESC`)
      .limit(limit)
      .offset(offset);

    if (data.status) {
      const s = data.status.toLowerCase();
      q = db
        .select()
        .from(workspaceInvites)
        .where(and(whereClause, sql`workspace_invites.status = ${s}`))
        .orderBy(sql`workspace_invites.created_at DESC`)
        .limit(limit)
        .offset(offset);
    }

    if (data.search) {
      const pattern = `%${data.search}%`;
      q = db
        .select()
        .from(workspaceInvites)
        .where(and(whereClause, sql`workspace_invites.email ILIKE ${pattern}`))
        .orderBy(sql`workspace_invites.created_at DESC`)
        .limit(limit)
        .offset(offset);
    }

    const rows = await q;

    const invites: WorkspaceInviteListItem[] = rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      email: r.email,
      authzRoleId: r.authzRoleId,
      status: (r.status as string) ?? 'pending',
      expiresAt: r.expiresAt ?? new Date(),
      createdAt: r.createdAt ?? new Date(),
    }));

    const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;

    return {
      invites,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

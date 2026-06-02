import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { and, desc, eq, ilike, isNull, sql } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { validateRequired } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type {
  ListUserWorkspacesRequest,
  ListUserWorkspacesResponse,
  WorkspaceListItem,
} from '../types';
import { workspaceMembers, workspaces } from '../../../../shared/db/schema';

@Injectable()
export class ListUserWorkspacesService {
  async listUserWorkspaces(
    data: ListUserWorkspacesRequest,
    user: GrpcUser,
  ): Promise<ListUserWorkspacesResponse> {
    this.validateInput(data);

    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    const page = Math.max(1, parseInt(data.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(data.limit ?? '20', 10)));
    const offset = (page - 1) * limit;
    const includeArchived = data.includeArchived ?? false;
    const searchClause = data.search?.trim()
      ? ilike(workspaces.name, `%${data.search.trim()}%`)
      : undefined;

    const filters = [
      eq(workspaceMembers.userId, user.id),
      eq(workspaceMembers.isActive, true),
      eq(workspaceMembers.workspaceId, workspaces.id),
      ...(includeArchived ? [] : [isNull(workspaces.deletedAt)]),
      ...(searchClause ? [searchClause] : []),
    ];

    const [countRow] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(and(...filters));

    const total = Number(countRow?.total ?? 0);

    const rows = await db
      .select({
        workspaceId: workspaces.id,
        name: workspaces.name,
        logoUrl: workspaces.logoUrl,
        deletedAt: workspaces.deletedAt,
        roleId: workspaceMembers.authzRoleId,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(and(...filters))
      .orderBy(desc(workspaces.createdAt))
      .limit(limit)
      .offset(offset);

    const workspacesList: WorkspaceListItem[] = rows.map((row) => ({
      id: row.workspaceId,
      name: row.name,
      logoUrl: row.logoUrl ?? undefined,
      isArchived: row.deletedAt !== null,
      roleId: row.roleId,
    }));

    return {
      workspaces: workspacesList,
      pagination: {
        page,
        limit,
        total,
        totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
      },
    };
  }

  private validateInput(data: ListUserWorkspacesRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    if (
      data.page !== undefined &&
      (!Number.isInteger(parseInt(data.page, 10)) ||
        parseInt(data.page, 10) < 1)
    ) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Page must be a positive integer',
      });
    }

    if (
      data.limit !== undefined &&
      (!Number.isInteger(parseInt(data.limit, 10)) ||
        parseInt(data.limit, 10) < 1)
    ) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Limit must be a positive integer',
      });
    }

    if (data.search !== undefined) {
      const requiredResult = validateRequired(data.search, 'Search');
      if (!requiredResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: requiredResult.message,
        });
      }
    }

    if (
      data.includeArchived !== undefined &&
      typeof data.includeArchived !== 'boolean'
    ) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'includeArchived must be a boolean',
      });
    }
  }
}

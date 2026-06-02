import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { AuthzService } from '../../authz/authz.service';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { BoardFuncs } from '../../../shared/func/board';
import { ColumnFuncs } from '../../../shared/func/column';
import { ActionResponse } from '../../../shared/types/genereal';
import { BulkReorderColumnsRequest } from '../types';
import { validateUUID } from '../../../shared/validations';

@Injectable()
export class BulkReorderColumnsService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly columnFuncs: ColumnFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async bulkReorderColumns(
    data: BulkReorderColumnsRequest,
    user: GrpcUser,
  ): Promise<ActionResponse> {
    this.validateInput(data);

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

    const member = await this.workspaceMembers.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    if (!member || !member.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    const permission = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:boards:manage',
      }),
    );

    if (!permission?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const board = await this.boardFuncs.getActiveBoard(data.boardId);

    if (!board || board.workspaceId !== data.workspaceId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Board not found',
      });
    }

    const existing = await this.columnFuncs.listByBoard(data.boardId, {
      includeArchived: true,
    });
    const existingIds = new Set(existing.map((c) => c.id));

    for (const item of data.columns) {
      if (!existingIds.has(item.columnId)) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: `Column ${item.columnId} does not belong to this board`,
        });
      }
    }

    await this.columnFuncs.bulkReorder({
      boardId: data.boardId,
      columns: data.columns.map((c) => ({
        columnId: c.columnId,
        position: c.position,
      })),
    });

    return {
      success: true,
      message: 'Columns reordered successfully',
    };
  }

  private validateInput(data: BulkReorderColumnsRequest): void {
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

    const boardIdResult = validateUUID(data.boardId, 'Board ID');
    if (!boardIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: boardIdResult.message,
      });
    }

    if (!Array.isArray(data.columns) || data.columns.length === 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'At least one column ordering must be provided',
      });
    }

    for (const item of data.columns) {
      const columnIdResult = validateUUID(item?.columnId, 'Column ID');
      if (!columnIdResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: columnIdResult.message,
        });
      }

      if (
        item.position === undefined ||
        item.position === null ||
        !Number.isInteger(item.position) ||
        item.position < 1
      ) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: 'Each column position must be a positive integer',
        });
      }
    }
  }
}

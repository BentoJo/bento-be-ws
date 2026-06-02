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
import {
  validateRequired,
  validateStringLength,
  validateUUID,
} from '../../../shared/validations';
import { ColumnResponse, CreateColumnRequest } from '../types';

@Injectable()
export class CreateColumnService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly columnFuncs: ColumnFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async createColumn(
    data: CreateColumnRequest,
    user: GrpcUser,
  ): Promise<ColumnResponse> {
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

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:boards:manage',
      }),
    );

    if (!perm?.allowed) {
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

    let position: number;
    if (data.position !== undefined && data.position !== null) {
      position = data.position;
    } else {
      const maxPosition = await this.columnFuncs.getMaxPosition(data.boardId);
      position = maxPosition + 1;
    }

    const column = await this.columnFuncs.create({
      workspaceId: data.workspaceId,
      boardId: data.boardId,
      name: data.name,
      position,
    });

    return {
      id: column.id,
      workspaceId: column.workspaceId,
      boardId: column.boardId,
      name: column.name,
      position: Number(column.position),
      isArchived: column.archivedAt !== null,
      createdAt: column.createdAt
        ? column.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: column.updatedAt
        ? column.updatedAt.toISOString()
        : undefined,
    };
  }

  private validateInput(data: CreateColumnRequest): void {
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

    const nameRequiredResult = validateRequired(data.name, 'Name');
    if (!nameRequiredResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: nameRequiredResult.message,
      });
    }

    const nameResult = validateStringLength(data.name, 1, 255, 'Name');
    if (!nameResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: nameResult.message,
      });
    }
  }
}

import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../../shared/func/board';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { BoardResponse, UpdateBoardRequest } from '../types';
import {
  validateEnum,
  validateRequired,
  validateStringLength,
  validateUUID,
} from '../../../../shared/validations';
import { boardVisibilityEnum } from '../../../../shared/db/schema';

@Injectable()
export class UpdateBoardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async updateBoard(
    data: UpdateBoardRequest,
    user: GrpcUser,
  ): Promise<BoardResponse> {
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

    const updatedBoard = await this.boardFuncs.update(data.boardId, {
      name: data.name,
      icon: data.icon,
      visibility: data.visibility,
    });

    if (!updatedBoard) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Board not found',
      });
    }

    return {
      id: updatedBoard.id,
      workspaceId: updatedBoard.workspaceId,
      name: updatedBoard.name,
      icon: updatedBoard.icon ?? null,
      visibility: updatedBoard.visibility ?? 'public',
      createdBy: updatedBoard.createdBy,
      createdAt: updatedBoard.createdAt
        ? updatedBoard.createdAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private validateInput(data: UpdateBoardRequest): void {
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

    const hasUpdates =
      data.name !== undefined ||
      data.icon !== undefined ||
      data.visibility !== undefined;

    const requiredResult = validateRequired(
      hasUpdates ? 'x' : '',
      'Update payload',
    );

    if (!requiredResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'At least one field must be provided for update',
      });
    }

    if (data.name !== undefined) {
      const nameResult = validateStringLength(data.name, 3, 255, 'Name');
      if (!nameResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: nameResult.message,
        });
      }
    }

    if (data.visibility !== undefined) {
      const visibilityResult = validateEnum(
        data.visibility,
        boardVisibilityEnum.enumValues,
        'Visibility',
      );

      if (!visibilityResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: visibilityResult.message,
        });
      }
    }
  }
}

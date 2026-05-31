import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { AuthzService } from '../../../authz/authz.service';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../../shared/func/board';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import type { ActionResponse } from '../../../../shared/types/genereal';
import type { RestoreBoardRequest } from '../types';
import { validateUUID } from '../../../../shared/validations';

@Injectable()
export class RestoreBoardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async restoreBoard(
    data: RestoreBoardRequest,
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

    const board = await this.boardFuncs.getById(data.boardId);

    if (
      !board ||
      board.workspaceId !== data.workspaceId ||
      board.deletedAt === null
    ) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Board not found or has not been deleted',
      });
    }

    const restoredBoard = await this.boardFuncs.update(data.boardId, {
      deletedAt: null,
    });

    if (!restoredBoard) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to restore board',
      });
    }

    const response: ActionResponse = {
      success: true,
      message: 'Board restored successfully',
    };

    return response;
  }

  private validateInput(data: RestoreBoardRequest): void {
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
  }
}

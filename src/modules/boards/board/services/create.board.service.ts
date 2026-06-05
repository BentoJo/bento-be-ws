import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { BoardResponse, CreateBoardRequest } from '../types';
import { RpcException } from '@nestjs/microservices';
import { boardVisibilityEnum } from '../../../../shared/db/schema';
import {
  validateEnum,
  validateRequired,
  validateStringLength,
} from '../../../../shared/validations';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { BoardFuncs } from '../../../../shared/func/board';

@Injectable()
export class CreateBoardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async createBoard(
    data: CreateBoardRequest,
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

    const newBoard = await this.boardFuncs.create({
      workspaceId: data.workspaceId,
      name: data.name,
      icon: data.icon ?? null,
      visibility: data.visibility,
      createdBy: user.id,
    });

    await this.boardFuncs.addBoardMember({
      boardId: newBoard.id,
      workspaceMemberId: member.id,
    });

    return {
      id: newBoard.id,
      workspaceId: newBoard.workspaceId,
      name: newBoard.name,
      icon: newBoard.icon ?? null,
      visibility: newBoard.visibility ?? 'public',
      createdBy: newBoard.createdBy,
      createdAt: newBoard.createdAt
        ? newBoard.createdAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private validateInput(data: CreateBoardRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const workspaceIdResult = validateRequired(
      data.workspaceId,
      'Workspace ID',
    );
    if (!workspaceIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdResult.message,
      });
    }

    const nameRequiredResult = validateRequired(data.name, 'Name');
    if (!nameRequiredResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: nameRequiredResult.message,
      });
    }

    const nameResult = validateStringLength(data.name, 3, 255, 'Name');
    if (!nameResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: nameResult.message,
      });
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

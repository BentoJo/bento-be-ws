import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom, timeout } from 'rxjs';
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
import db from '../../../../shared/configs/db.config';

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

    console.log('Creating board with data:', data, 'for user:', user?.id);
    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    console.log('User is authenticated:', user.id);
    // 1. Workspace check (outside tx)
    const workspace = await this.workspaceFuncs.findByIdActive(
      data.workspaceId,
    );

    console.log('Workspace found:', !!workspace);
    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }
    console.log('Workspace is active:', workspace.id);

    // 2. Member check (outside tx)
    const member = await this.workspaceMembers.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    console.log('Member found:', !!member);
    if (!member || !member.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    console.log('Member is active:', member.id);
    // 3. Permission check (with timeout protection)
    try {
      const perm = await firstValueFrom(
        this.authZ
          .checkPermission({
            roleId: member.authzRoleId,
            scopeId: data.workspaceId,
            permission: 'workspace:boards:manage',
          })
          .pipe(timeout(5000)),
      );

      console.log('Permission check result:', perm);
      if (!perm?.allowed) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Permission denied',
        });
      }
    } catch {
      console.error('Authorization service timeout or error');
      throw new RpcException({
        code: GrpcStatus.DEADLINE_EXCEEDED,
        message: 'Authorization service timeout',
      });
    }

    // 4. DB transaction (atomic)
    console.log('Starting DB transaction to create board');
    const result = await db.transaction(async (tx) => {
      console.log('Creating board record in DB');
      const newBoard = await this.boardFuncs.create(
        {
          workspaceId: data.workspaceId,
          name: data.name,
          icon: data.icon ?? null,
          visibility: data.visibility,
          createdBy: user.id,
        },
        tx,
      );

      console.log('Board created with ID:', newBoard.id);
      const boardMember = await this.boardFuncs.addBoardMember(
        {
          boardId: newBoard.id,
          workspaceMemberId: member.id,
          workspaceId: data.workspaceId,
        },
        tx,
      );
      console.log('Board member added:', !!boardMember);
      if (!boardMember) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: 'Failed to add board member',
        });
      }

      return newBoard;
    });
    console.log('DB transaction completed, returning result');

    return {
      id: result.id,
      workspaceId: result.workspaceId,
      name: result.name,
      icon: result.icon ?? null,
      visibility: result.visibility ?? 'public',
      createdBy: result.createdBy,
      createdAt: result.createdAt
        ? result.createdAt.toISOString()
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

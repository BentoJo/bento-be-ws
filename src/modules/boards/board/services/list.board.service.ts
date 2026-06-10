import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../../shared/func/board';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { validateUUID } from '../../../../shared/validations';
import { BoardResponse, ListBoardsRequest, ListBoardsResponse } from '../types';

@Injectable()
export class ListBoardsService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async listBoards(
    data: ListBoardsRequest,
    user: GrpcUser,
  ): Promise<ListBoardsResponse> {
    this.validateInput(data);

    const workspace = await this.workspaceFuncs.findByIdActive(
      data.workspaceId,
    );

    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    let isMember = false;
    let canViewAll = false;

    if (user?.id) {
      const member = await this.workspaceMembers.getWorkspaceMember(
        data.workspaceId,
        user.id,
      );

      if (!member || !member.isActive) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'you must be a workspace member to view boards',
        });
      }

      isMember = member?.isActive;

      if (member?.isActive) {
        const permissions = await firstValueFrom(
          this.authZ.batchCheckPermissions({
            roleId: member.authzRoleId,
            scopeId: data.workspaceId,
            permissions: [
              'workspace:boards:manage',
              'workspace:boards:read_private',
            ],
          }),
        );

        canViewAll =
          !!permissions?.results?.['workspace:boards:manage'] ||
          !!permissions?.results?.['workspace:boards:read_private'];
      }
    }

    const rows = await this.boardFuncs.list(data.workspaceId, {
      isMember,
      canViewAll,
    });

    const boards: BoardResponse[] = rows.map((board) => ({
      id: board.id,
      workspaceId: board.workspaceId,
      name: board.name,
      icon: board.icon ?? null,
      visibility: board.visibility ?? 'public',
      createdBy: board.createdBy,
      createdAt: board.createdAt
        ? board.createdAt.toISOString()
        : new Date().toISOString(),
    }));

    return { boards };
  }

  private validateInput(data: ListBoardsRequest): void {
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
  }
}

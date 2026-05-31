import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { TeamsFuncs } from '../../../../shared/func/teams';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type { ListMemberTeamsRequest, ListMemberTeamsResponse } from '../types';

@Injectable()
export class ListMemberTeamsService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async listMemberTeams(
    data: ListMemberTeamsRequest,
    user: GrpcUser,
  ): Promise<ListMemberTeamsResponse> {
    this.validateInput(data);

    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    const actor = await this.workspaceMembersFuncs.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    if (!actor || !actor.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    const hasPermission = await this.hasAnyPermission(
      actor.authzRoleId,
      data.workspaceId,
      ['workspace:team:member:read', 'workspace:teams:manage'],
    );

    if (!hasPermission) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const targetMember = await this.workspaceMembersFuncs.getWorkspaceMember(
      data.workspaceId,
      data.userId,
    );

    if (!targetMember || !targetMember.isActive) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'WORKSPACE_MEMBER_NOT_FOUND',
      });
    }

    const teams = await this.teamsFuncs.findMemberTeams(
      data.workspaceId,
      data.userId,
    );

    return {
      teams: teams.map((team) => ({
        teamId: team.teamId,
        name: team.name,
        icon: team.icon ?? undefined,
      })),
    };
  }

  private validateInput(data: ListMemberTeamsRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.validateUuidField(data.workspaceId, 'Workspace ID');
    this.validateUuidField(data.userId, 'User ID');
  }

  private validateUuidField(value: string, fieldName: string): void {
    const required = validateRequired(value, fieldName);
    if (!required.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: required.message,
      });
    }

    const uuid = validateUUID(value, fieldName);
    if (!uuid.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: uuid.message,
      });
    }
  }

  private async hasAnyPermission(
    roleId: string,
    scopeId: string,
    permissions: string[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      const result = await firstValueFrom(
        this.authZ.checkPermission({
          roleId,
          scopeId,
          permission,
        }),
      );

      if (result?.allowed) {
        return true;
      }
    }

    return false;
  }
}

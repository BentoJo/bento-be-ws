import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { TeamsFuncs } from '../../../../shared/func/teams';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import { UnarchiveTeamRequest, UnarchiveTeamResponse } from '../types';

@Injectable()
export class UnarchiveTeamService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async unarchiveTeam(
    data: UnarchiveTeamRequest,
    user: GrpcUser,
  ): Promise<UnarchiveTeamResponse> {
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
      ['workspace:team:unarchive', 'workspace:teams:manage'],
    );

    if (!hasPermission) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const team = await this.teamsFuncs.findByIdAndWorkspace(
      data.teamId,
      data.workspaceId,
    );

    if (!team || !team.archivedAt || team.deletedAt) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'ARCHIVED_TEAM_NOT_FOUND',
      });
    }

    const conflict =
      await this.teamsFuncs.findByWorkspaceIdAndNameActiveNotArchivedExcludingId(
        data.workspaceId,
        team.name,
        data.teamId,
      );

    if (conflict) {
      throw new RpcException({
        code: GrpcStatus.ALREADY_EXISTS,
        message: 'TEAM_NAME_ALREADY_EXISTS',
      });
    }

    const unarchived = await this.teamsFuncs.unarchive(data.teamId);

    if (!unarchived) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to unarchive team',
      });
    }

    return {
      success: true,
      message: 'Team unarchived successfully',
      unarchivedAt: (unarchived.updatedAt ?? new Date()).toISOString(),
    };
  }

  private validateInput(data: UnarchiveTeamRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.validateUuidField(data.workspaceId, 'Workspace ID');
    this.validateUuidField(data.teamId, 'Team ID');
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

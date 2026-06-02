import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../authz/authz.service';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { TeamsFuncs } from '../../../shared/func/teams';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../shared/validations';
import { RemoveTeamMemberRequest, RemoveTeamMemberResponse } from '../types';

@Injectable()
export class RemoveTeamMemberService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async removeTeamMember(
    data: RemoveTeamMemberRequest,
    user: GrpcUser,
  ): Promise<RemoveTeamMemberResponse> {
    this.validateInput(data);

    const { workspaceId, teamId, userId } = data;

    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    const actor = await this.workspaceMembersFuncs.getWorkspaceMember(
      workspaceId,
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
      workspaceId,
      ['workspace:team:member:remove', 'workspace:teams:manage'],
    );

    if (!hasPermission) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const team = await this.teamsFuncs.findByIdAndWorkspace(
      teamId,
      workspaceId,
    );

    if (!team || team.deletedAt) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'TEAM_NOT_FOUND',
      });
    }

    const targetMember = await this.workspaceMembersFuncs.getWorkspaceMember(
      workspaceId,
      userId,
    );

    if (!targetMember || !targetMember.isActive) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'WORKSPACE_MEMBER_NOT_FOUND',
      });
    }

    const teamMember = await this.teamsFuncs.findTeamMember(
      teamId,
      targetMember.userId,
    );

    if (!teamMember) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'TEAM_MEMBER_NOT_FOUND',
      });
    }

    await this.teamsFuncs.removeTeamMember(teamId, targetMember.userId);

    return {
      success: true,
      message: 'Team member removed successfully',
    };
  }

  private validateInput(data: RemoveTeamMemberRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const { workspaceId, teamId, userId } = data;
    this.validateUuidField(workspaceId, 'Workspace ID');
    this.validateUuidField(teamId, 'Team ID');
    this.validateUuidField(userId, 'User ID');
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

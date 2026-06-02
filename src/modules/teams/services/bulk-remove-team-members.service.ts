import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import db from '../../../shared/configs/db.config';
import { AuthzService } from '../../authz/authz.service';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { TeamsFuncs } from '../../../shared/func/teams';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../shared/validations';
import type {
  BulkRemoveTeamMembersRequest,
  BulkTeamMembersResponse,
} from '../types';

@Injectable()
export class BulkRemoveTeamMembersService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async bulkRemoveTeamMembers(
    data: BulkRemoveTeamMembersRequest,
    user: GrpcUser,
  ): Promise<BulkTeamMembersResponse> {
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
      ['workspace:team:member:remove', 'workspace:teams:manage'],
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

    if (!team || team.deletedAt || team.archivedAt) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'TEAM_NOT_FOUND',
      });
    }

    const userIds = this.normalizeUserIds(data.userIds);

    if (userIds.length === 0) {
      return {
        success: true,
        message: 'No team members to remove',
      };
    }

    await db.transaction(async (tx) => {
      const workspaceMembers =
        await this.workspaceMembersFuncs.findActiveByWorkspaceIdAndUserIds(
          data.workspaceId,
          userIds,
          tx,
        );

      if (workspaceMembers.length !== userIds.length) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'WORKSPACE_MEMBER_NOT_FOUND',
        });
      }

      const workspaceMemberIds = workspaceMembers.map((member) => member.id);
      const existing =
        await this.teamsFuncs.findTeamMembersByWorkspaceMemberIds(
          data.teamId,
          workspaceMemberIds,
          tx,
        );

      if (existing.length !== workspaceMemberIds.length) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'TEAM_MEMBER_NOT_FOUND',
        });
      }

      const removed = await this.teamsFuncs.removeTeamMembers(
        data.teamId,
        workspaceMemberIds,
        tx,
      );

      if (removed.length !== workspaceMemberIds.length) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: 'Failed to remove team members',
        });
      }
    });

    return {
      success: true,
      message: 'Team members removed successfully',
    };
  }

  private validateInput(data: BulkRemoveTeamMembersRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.validateUuidField(data.workspaceId, 'Workspace ID');
    this.validateUuidField(data.teamId, 'Team ID');

    if (!Array.isArray(data.userIds)) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'User IDs must be an array',
      });
    }

    for (const userId of data.userIds) {
      this.validateUuidField(userId, 'User ID');
    }
  }

  private normalizeUserIds(userIds: string[]): string[] {
    return Array.from(
      new Set(userIds.map((userId) => userId.trim()).filter(Boolean)),
    );
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

import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { ListTeamMembersRequest, ListTeamMembersResponse } from '../types';
import { TeamsFuncs } from '../../../shared/func/teams';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { AuthzService } from '../../authz/authz.service';
import { IamService } from '../../iam/iam.service';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { validateRequired, validateUUID } from '../../../shared/validations';

@Injectable()
export class ListTeamMembersService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
    private readonly iam: IamService,
  ) {}

  async listTeamMembers(
    data: ListTeamMembersRequest,
    user: GrpcUser,
  ): Promise<ListTeamMembersResponse> {
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

    const team = await this.teamsFuncs.findByIdAndWorkspace(
      data.teamId,
      data.workspaceId,
    );

    if (!team || team.deletedAt) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'TEAM_NOT_FOUND',
      });
    }

    const page = data.page ?? 1;
    const limit = Math.min(data.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const members = await this.teamsFuncs.findTeamMembersPaginated(
      data.teamId,
      limit,
      offset,
    );

    const total = await this.teamsFuncs.countTeamMembers(data.teamId);

    const workspaceMemberUserIds = members.map((m) => m.workspaceMemberId);
    const workspaceMembers =
      workspaceMemberUserIds.length > 0
        ? await this.workspaceMembersFuncs.findActiveByWorkspaceIdAndUserIds(
            data.workspaceId,
            workspaceMemberUserIds,
          )
        : [];

    const memberMap = new Map(workspaceMembers.map((m) => [m.userId, m]));

    const userIds = Array.from(
      new Set(
        members
          .map((m) => memberMap.get(m.workspaceMemberId)?.userId)
          .filter((id): id is string => !!id),
      ),
    );

    const iamUsers =
      userIds.length > 0
        ? await firstValueFrom(this.iam.getUsersByIds({ userIds }))
        : { users: [] };

    const usersById = new Map((iamUsers.users ?? []).map((u) => [u.id, u]));

    const enrichedMembers = members
      .filter((m) => memberMap.has(m.workspaceMemberId))
      .map((m) => {
        const wm = memberMap.get(m.workspaceMemberId)!;
        const userInfo = usersById.get(wm.userId);

        return {
          workspaceMemberId: m.workspaceMemberId,
          teamMemberId: m.id,
          userId: wm.userId,
          joinedAt: m.joinedAt?.toISOString() || new Date().toISOString(),
          user: userInfo
            ? {
                id: userInfo.id,
                email: userInfo.email,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                avatarUrl: userInfo.avatarUrl || null,
              }
            : undefined,
        };
      });

    const totalPages = Math.ceil(total / limit);

    return {
      members: enrichedMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private validateInput(data: ListTeamMembersRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.validateUuidField(data.workspaceId, 'Workspace ID');
    this.validateUuidField(data.teamId, 'Team ID');

    if (data.page !== undefined && data.page < 1) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Page must be >= 1',
      });
    }

    if (data.limit !== undefined && (data.limit < 1 || data.limit > 100)) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Limit must be between 1 and 100',
      });
    }
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

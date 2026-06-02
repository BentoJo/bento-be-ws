import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../authz/authz.service';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { TeamsFuncs } from '../../../shared/func/teams';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../shared/validations';
import { ListTeamsRequest, ListTeamsResponse } from '../types';

@Injectable()
export class ListTeamsService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async listTeams(
    data: ListTeamsRequest,
    user: GrpcUser,
  ): Promise<ListTeamsResponse> {
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
      ['workspace:team:read', 'workspace:teams:manage'],
    );

    if (!hasPermission) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const page = data.page ?? 1;
    const limit = Math.min(data.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const teamsData = await this.teamsFuncs.findByWorkspaceIdPaginated(
      data.workspaceId,
      limit,
      offset,
      data.search,
    );

    const total = await this.teamsFuncs.countTeamsByWorkspace(
      data.workspaceId,
      data.search,
    );

    const teamIds = teamsData.map((t) => t.id);
    const memberCounts =
      teamIds.length > 0
        ? await this.getTeamMemberCounts(teamIds)
        : new Map<string, number>();

    const teams = teamsData.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description || undefined,
      icon: team.icon || undefined,
      memberCount: memberCounts.get(team.id) || 0,
      createdAt: team.createdAt?.toISOString() || new Date().toISOString(),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      teams,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private async getTeamMemberCounts(
    teamIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    for (const teamId of teamIds) {
      const count = await this.teamsFuncs.countTeamMembers(teamId);
      counts.set(teamId, count);
    }

    return counts;
  }

  private validateInput(data: ListTeamsRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.validateUuidField(data.workspaceId, 'Workspace ID');

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

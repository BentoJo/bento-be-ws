import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { and, eq } from 'drizzle-orm';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import db from '../../../../shared/configs/db.config';
import { workspaceMembers } from '../../../../shared/db/schema';
import { TeamsFuncs } from '../../../../shared/func/teams';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type { AddTeamMemberRequest, TeamMemberResponse } from '../types';

@Injectable()
export class AddTeamMemberService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async addTeamMember(
    data: AddTeamMemberRequest,
    user: GrpcUser,
  ): Promise<TeamMemberResponse> {
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

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: actor.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:team_members:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const team = await this.teamsFuncs.findByIdAndWorkspaceActive(
      data.teamId,
      data.workspaceId,
    );

    if (!team || team.archivedAt) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Team not found',
      });
    }

    const targetWorkspaceMember = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, data.workspaceMemberId),
          eq(workspaceMembers.workspaceId, data.workspaceId),
          eq(workspaceMembers.isActive, true),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!targetWorkspaceMember) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace member not found',
      });
    }

    const existing = await this.teamsFuncs.findTeamMember(
      data.teamId,
      data.workspaceMemberId,
    );
    if (existing) {
      throw new RpcException({
        code: GrpcStatus.ALREADY_EXISTS,
        message: 'MEMBER_ALREADY_IN_TEAM',
      });
    }

    const created = await this.teamsFuncs.addTeamMember({
      workspaceId: data.workspaceId,
      teamId: data.teamId,
      workspaceMemberId: data.workspaceMemberId,
    });

    if (!created) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to add member to team',
      });
    }

    return {
      id: created.id,
      teamId: created.teamId,
      workspaceMemberId: created.workspaceMemberId,
      joinedAt: (created.joinedAt ?? new Date()).toISOString(),
    };
  }

  private validateInput(data: AddTeamMemberRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.validateUuidField(data.workspaceId, 'Workspace ID');
    this.validateUuidField(data.teamId, 'Team ID');
    this.validateUuidField(data.workspaceMemberId, 'Workspace member ID');
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
}

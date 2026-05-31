import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { TeamsFuncs } from '../../../../shared/func/teams';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import {
  validateRequired,
  validateUUID,
  validateUrl,
} from '../../../../shared/validations';
import type { CreateTeamRequest, TeamResponse } from '../types';

@Injectable()
export class CreateTeamService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async createTeam(
    data: CreateTeamRequest,
    user: GrpcUser,
  ): Promise<TeamResponse> {
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
        permission: 'workspace:teams:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const normalizedName = data.name.trim();

    const existingTeam = await this.teamsFuncs.findByWorkspaceIdAndNameActive(
      data.workspaceId,
      normalizedName,
    );
    if (existingTeam) {
      throw new RpcException({
        code: GrpcStatus.ALREADY_EXISTS,
        message: 'TEAM_NAME_ALREADY_EXISTS',
      });
    }

    const createdTeam = await this.teamsFuncs.create({
      workspaceId: data.workspaceId,
      name: normalizedName,
      description: data.description?.trim() || null,
      icon: data.icon?.trim() || null,
      createdBy: user.id,
    });

    if (!createdTeam) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to create team',
      });
    }

    return {
      id: createdTeam.id,
      workspaceId: createdTeam.workspaceId,
      name: createdTeam.name,
      description: createdTeam.description ?? undefined,
      icon: createdTeam.icon ?? undefined,
      isArchived: Boolean(createdTeam.archivedAt),
      createdAt: (createdTeam.createdAt ?? new Date()).toISOString(),
      updatedAt: createdTeam.updatedAt
        ? createdTeam.updatedAt.toISOString()
        : undefined,
    };
  }

  private validateInput(data: CreateTeamRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const workspaceIdRequired = validateRequired(
      data.workspaceId,
      'Workspace ID',
    );
    if (!workspaceIdRequired.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdRequired.message,
      });
    }

    const workspaceIdResult = validateUUID(data.workspaceId, 'Workspace ID');
    if (!workspaceIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdResult.message,
      });
    }

    const nameRequired = validateRequired(data.name, 'Team name');
    if (!nameRequired.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: nameRequired.message,
      });
    }

    this.validateTeamName(data.name);

    if (data.description !== undefined) {
      this.validateTeamDescription(data.description);
    }

    if (data.icon !== undefined) {
      this.validateTeamIcon(data.icon);
    }
  }

  private validateTeamName(name: string): void {
    const normalized = name.trim();

    if (normalized.length < 2 || normalized.length > 255) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Team name must be between 2 and 255 characters',
      });
    }
  }

  private validateTeamDescription(description: string): void {
    const normalized = description.trim();

    if (normalized.length === 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Description cannot be empty',
      });
    }

    if (normalized.length > 1000) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Description must not exceed 1000 characters',
      });
    }
  }

  private validateTeamIcon(icon: string): void {
    const normalized = icon.trim();

    if (normalized.length === 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Icon cannot be empty',
      });
    }

    if (normalized.length > 100) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Icon must not exceed 100 characters',
      });
    }

    const isIconKey = /^[a-zA-Z0-9_.:-]+$/.test(normalized);
    const isUrl = validateUrl(normalized, 'Icon').valid;

    if (!isIconKey && !isUrl) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Icon must be a valid URL or icon key',
      });
    }
  }
}

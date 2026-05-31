import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { TeamsFuncs } from '../../../../shared/func/teams';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import {
  validateRequired,
  validateUUID,
  validateUrl,
} from '../../../../shared/validations';
import { TeamUpdateRequest, TeamUpdateResponse } from '../types';

@Injectable()
export class UpdateTeamService {
  constructor(
    private readonly teamsFuncs: TeamsFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async updateTeam(
    data: TeamUpdateRequest,
    user: GrpcUser,
  ): Promise<TeamUpdateResponse> {
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
      ['workspace:team:update', 'workspace:teams:manage'],
    );

    if (!hasPermission) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const team = await this.teamsFuncs.findByIdAndWorkspaceActive(
      data.teamId,
      data.workspaceId,
    );

    if (!team) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'TEAM_NOT_FOUND',
      });
    }

    if (team.archivedAt) {
      throw new RpcException({
        code: GrpcStatus.ALREADY_EXISTS,
        message: 'TEAM_ARCHIVED',
      });
    }

    const normalizedName = data.name?.trim();
    const normalizedDescription =
      data.description !== undefined ? data.description.trim() : undefined;
    const normalizedIcon =
      data.icon !== undefined ? data.icon.trim() : undefined;

    if (normalizedName !== undefined) {
      const conflict =
        await this.teamsFuncs.findByWorkspaceIdAndNameActiveExcludingId(
          data.workspaceId,
          normalizedName,
          data.teamId,
        );

      if (conflict) {
        throw new RpcException({
          code: GrpcStatus.ALREADY_EXISTS,
          message: 'TEAM_NAME_ALREADY_EXISTS',
        });
      }
    }

    const updated = await this.teamsFuncs.update(data.teamId, {
      name: normalizedName,
      description: normalizedDescription,
      icon: normalizedIcon,
    });

    if (!updated) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to update team',
      });
    }

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      name: updated.name,
      description: updated.description ?? undefined,
      icon: updated.icon ?? undefined,
      updatedAt: (updated.updatedAt ?? new Date()).toISOString(),
    };
  }

  private validateInput(data: TeamUpdateRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.validateUuidField(data.workspaceId, 'Workspace ID');
    this.validateUuidField(data.teamId, 'Team ID');

    const hasUpdate =
      data.name !== undefined ||
      data.description !== undefined ||
      data.icon !== undefined;

    if (!hasUpdate) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'At least one field must be provided for update',
      });
    }

    if (data.name !== undefined) {
      this.validateTeamName(data.name);
    }

    if (data.description !== undefined) {
      this.validateTeamDescription(data.description);
    }

    if (data.icon !== undefined) {
      this.validateTeamIcon(data.icon);
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

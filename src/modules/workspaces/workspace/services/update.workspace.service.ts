import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { AuthzService } from '../../../authz/authz.service';
import {
  validateName,
  validateUrl,
  validateRequired,
  validateUUID,
} from '../../../../shared/validations';

import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type { UpdateWorkspaceRequest, WorkspaceResponse } from '../types';

@Injectable()
export class UpdateWorkspaceService {
  private readonly logger = new Logger(UpdateWorkspaceService.name);

  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async updateWorkspace(
    data: UpdateWorkspaceRequest,
    user: GrpcUser,
  ): Promise<WorkspaceResponse> {
    // Input validation
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
        permission: 'workspace:workspace:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    // perform update using WorkspaceFuncs
    const updated = await this.workspaceFuncs.update(data.workspaceId, {
      name: data.name,
      logoUrl: data.logoUrl !== undefined ? data.logoUrl : undefined,
      logoKey: data.logoKey !== undefined ? data.logoKey : undefined,
    });

    return {
      id: updated.id,
      name: updated.name,
      logoUrl: updated.logoUrl ?? undefined,
      ownerId: updated.ownerUserId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt
        ? updated.updatedAt.toISOString()
        : undefined,
    };
  }

  validateInput(data: UpdateWorkspaceRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const hasUpdate =
      data.name !== undefined ||
      data.logoUrl !== undefined ||
      data.logoKey !== undefined;

    const requiredResult = validateRequired(
      hasUpdate ? 'x' : '',
      'Update payload',
    );
    if (!hasUpdate || !requiredResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'At least one field must be provided for update',
      });
    }

    const workspaceIdResult = validateUUID(data.workspaceId, 'Workspace ID');
    if (!workspaceIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdResult.message,
      });
    }

    if (data.name !== undefined) {
      const nameResult = validateName(data.name, 'Name');
      if (!nameResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: nameResult.message,
        });
      }
    }

    if (data.logoUrl !== undefined && data.logoUrl !== null) {
      const logoUrlResult = validateUrl(data.logoUrl, 'Logo URL');
      if (!logoUrlResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: logoUrlResult.message,
        });
      }
    }
  }
}

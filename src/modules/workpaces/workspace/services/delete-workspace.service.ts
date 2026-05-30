import { Injectable } from '@nestjs/common';
import { DeleteWorkspaceRequest } from '../types';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import db from '../../../../shared/configs/db.config';
import { workspaces } from '../../../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { ActionResponse } from '../../../../shared/types/genereal';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';

@Injectable()
export class DeleteWorkspaceService {
  constructor(
    private readonly checkWorkspaceMember: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}
  async deleteWorkspace(
    data: DeleteWorkspaceRequest,
    user: GrpcUser,
  ): Promise<ActionResponse> {
    // Validation
    this.validateInput(data);

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, data.workspaceId))
      .limit(1);

    if (!workspace || workspace.deletedAt !== null) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found or has been deleted',
      });
    }

    const memberChecker = await this.checkWorkspaceMember.checkWorkspaceMember({
      workspaceId: data.workspaceId,
      userId: user.id, // Replace with actual user ID from auth context
    });

    if (!memberChecker.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'User is not a member of this workspace',
      });
    }

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: memberChecker.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:workspace:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied to delete workspace',
      });
    }

    const result = await db
      .update(workspaces)
      .set({ deletedAt: new Date() })
      .where(eq(workspaces.id, data.workspaceId))
      .execute();

    if (result.rowCount === 0) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to delete workspace',
      });
    }

    return {
      success: true,
      message: 'Workspace deleted successfully',
    };
  }

  private validateInput(data: DeleteWorkspaceRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const workspaceResult = validateRequired(data.workspaceId, 'Workspace ID');
    if (!workspaceResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceResult.message,
      });
    }

    const workspaceIdResult = validateUUID(data.workspaceId, 'Workspace ID');
    if (!workspaceIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: workspaceIdResult.message,
      });
    }
  }
}

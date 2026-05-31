import { Injectable } from '@nestjs/common';
import { GetWorkspaceRequest, WorkspaceResponse } from '../types';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import db from '../../../../shared/configs/db.config';
import { workspaces } from '../../../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';

@Injectable()
export class GetWorkspaceService {
  constructor(private readonly checkWorkspaceMember: WorkspaceMembersFuncs) {}
  async getWorkspace(
    data: GetWorkspaceRequest,
    user: GrpcUser,
  ): Promise<WorkspaceResponse> {
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

    return {
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerUserId,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt
        ? workspace.updatedAt.toISOString()
        : undefined,
      logoUrl: workspace.logoUrl ?? undefined,
    };
  }

  private validateInput(data: GetWorkspaceRequest): void {
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

import { Injectable } from '@nestjs/common';
import { TransferWorkspaceOwnershipRequest } from '../types';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import db from '../../../../shared/configs/db.config';
import { workspaceMembers, workspaces } from '../../../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { ActionResponse } from '../../../../shared/types/genereal';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';

@Injectable()
export class TransferWorkspaceOwnershipService {
  constructor(
    private readonly checkWorkspaceMember: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}
  async transferWorkspaceOwnership(
    data: TransferWorkspaceOwnershipRequest,
    user: GrpcUser,
  ): Promise<ActionResponse> {
    // Validation
    this.validateInput(data);

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, data.workspaceId))
      .innerJoin(
        workspaceMembers,
        eq(workspaceMembers.workspaceId, workspaces.id),
      )
      .limit(1);

    if (!workspace || workspace.workspaces.createdAt !== null) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found or has not been deleted',
      });
    }

    if (workspace.workspaces.ownerUserId !== user.id) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Only the workspace owner can transfer ownership',
      });
    }

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: workspace.workspace_members.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:workspace:transfer_ownership',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied to transfer workspace ownership',
      });
    }

    const result = await db
      .update(workspaces)
      .set({ ownerUserId: data.newOwnerId })
      .where(eq(workspaces.id, data.workspaceId))
      .execute();

    if (result.rowCount === 0) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to transfer workspace ownership',
      });
    }

    return {
      success: true,
      message: 'Workspace ownership transferred successfully',
    };
  }

  private validateInput(data: TransferWorkspaceOwnershipRequest): void {
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

    const newOwnerIdResult = validateRequired(data.newOwnerId, 'New Owner ID');
    if (!newOwnerIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: newOwnerIdResult.message,
      });
    }

    const newOwnerIdUuidResult = validateUUID(data.newOwnerId, 'New Owner ID');
    if (!newOwnerIdUuidResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: newOwnerIdUuidResult.message,
      });
    }
  }
}

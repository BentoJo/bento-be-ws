import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { and, eq, or } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { AuthzService } from '../../../authz/authz.service';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type {
  GetWorkspaceMemberRoleRequest,
  WorkspaceMemberRoleResponse,
} from '../types';
import { workspaceMembers } from '../../../../shared/db/schema';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GetWorkspaceMemberRoleService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async getWorkspaceMemberRole(
    data: GetWorkspaceMemberRoleRequest,
    user: GrpcUser,
  ): Promise<WorkspaceMemberRoleResponse> {
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

    const requesterMember = await this.workspaceMembersFuncs.getWorkspaceMember(
      data.workspaceId,
      user.id,
    );

    if (!requesterMember || !requesterMember.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    const permission = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: requesterMember.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:members:read',
      }),
    );

    if (!permission?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, data.workspaceId),
          eq(workspaceMembers.isActive, true),
          or(
            eq(workspaceMembers.id, data.memberId),
            eq(workspaceMembers.userId, data.memberId),
          ),
        ),
      )
      .limit(1);

    if (!member) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Member not found',
      });
    }

    return {
      authzRoleId: member.authzRoleId,
    };
  }

  private validateInput(data: GetWorkspaceMemberRoleRequest): void {
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

    const memberResult = validateRequired(data.memberId, 'Member ID');
    if (!memberResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: memberResult.message,
      });
    }

    const memberIdResult = validateUUID(data.memberId, 'Member ID');
    if (!memberIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: memberIdResult.message,
      });
    }
  }
}

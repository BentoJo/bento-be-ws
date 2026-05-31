import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { and, eq } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type {
  GetWorkspaceMemberRequest,
  WorkspaceMemberResponse,
} from '../types';
import { workspaceMembers } from '../../../../shared/db/schema';

@Injectable()
export class GetWorkspaceMemberService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembersFuncs: WorkspaceMembersFuncs,
  ) {}

  async getWorkspaceMember(
    data: GetWorkspaceMemberRequest,
    user: GrpcUser,
  ): Promise<WorkspaceMemberResponse> {
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

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, data.workspaceId),
          eq(workspaceMembers.isActive, true),
          eq(workspaceMembers.userId, data.memberId),
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
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      authzRoleId: member.authzRoleId,
      joinedAt: (member.joinedAt as Date).toISOString(),
    };
  }

  private validateInput(data: GetWorkspaceMemberRequest): void {
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

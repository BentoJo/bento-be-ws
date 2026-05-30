import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { and, eq } from 'drizzle-orm';

import db from '../../../../shared/configs/db.config';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import type {
  ValidateWorkspaceMembershipRequest,
  ValidateWorkspaceMembershipResponse,
} from '../types';
import { workspaceMembers } from '../../../../shared/db/schema';

@Injectable()
export class ValidateWorkspaceMembershipService {
  constructor(private readonly workspaceFuncs: WorkspaceFuncs) {}

  async validateWorkspaceMembership(
    data: ValidateWorkspaceMembershipRequest,
  ): Promise<ValidateWorkspaceMembershipResponse> {
    this.validateInput(data);

    const workspace = await this.workspaceFuncs.findByIdActive(
      data.workspaceId,
    );

    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, data.workspaceId),
          eq(workspaceMembers.userId, data.userId),
          eq(workspaceMembers.isActive, true),
        ),
      )
      .limit(1);

    return {
      isMember: member ? true : false,
      membershipId: member ? member.id : undefined,
      authzRoleId: member ? member.authzRoleId : undefined,
    };
  }

  private validateInput(data: ValidateWorkspaceMembershipRequest): void {
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

    const userResult = validateRequired(data.userId, 'User ID');
    if (!userResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: userResult.message,
      });
    }

    const userIdResult = validateUUID(data.userId, 'User ID');
    if (!userIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: userIdResult.message,
      });
    }
  }
}

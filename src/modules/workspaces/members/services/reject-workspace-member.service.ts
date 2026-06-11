import { Injectable } from '@nestjs/common';
import { RejectWorkspaceInviteRequest } from '../types';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import db from '../../../../shared/configs/db.config';
import { workspaceInvites, workspaces } from '../../../../shared/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { ActionResponse } from '../../../../shared/types/genereal';

@Injectable()
export class RejectWorkspaceInviteService {
  async rejectWorkspaceInvite(
    data: RejectWorkspaceInviteRequest,
  ): Promise<ActionResponse> {
    // Validation
    this.validateInput(data);

    return db.transaction(async (tx) => {
      const [invite] = await tx
        .select()
        .from(workspaceInvites)
        .innerJoin(
          workspaces,
          and(
            eq(workspaces.id, workspaceInvites.workspaceId),
            isNull(workspaces.deletedAt),
          ),
        )
        .where(eq(workspaceInvites.token, data.token))
        .limit(1);

      if (!invite) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Invite not found',
        });
      }

      if (invite.workspace_invites.status !== 'pending') {
        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: 'Invite is not pending',
        });
      }

      if (invite.workspace_invites.expiresAt < new Date()) {
        await tx
          .update(workspaceInvites)
          .set({ status: 'expired' })
          .where(eq(workspaceInvites.id, invite.workspace_invites.id));

        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: 'Invite has expired',
        });
      }

      const [revokedInvite] = await tx
        .update(workspaceInvites)
        .set({ status: 'revoked' })
        .where(eq(workspaceInvites.token, data.token))
        .returning();

      if (!revokedInvite) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Invite not found or already used',
        });
      }

      return {
        success: true,
        message: 'Workspace invite rejected successfully',
      };
    });
  }

  private validateInput(data: RejectWorkspaceInviteRequest): void {
    const tokenResult = validateRequired(data.token, 'Token');
    if (!tokenResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: tokenResult.message,
      });
    }

    const tResult = validateUUID(data.token, 'Token');
    if (!tResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: tResult.message,
      });
    }
  }
}

import { Injectable } from '@nestjs/common';
import {
  AcceptWorkspaceInviteRequest,
  WorkspaceMembershipResponse,
} from '../types';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { validateRequired, validateUUID } from '../../../../shared/validations';
import db from '../../../../shared/configs/db.config';
import {
  workspaceInvites,
  workspaceMembers,
  workspaces,
} from '../../../../shared/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';

@Injectable()
export class AcceptWorkspaceInviteService {
  constructor(private readonly checkWorkspaceMember: WorkspaceMembersFuncs) {}
  async acceptWorkspaceInvite(
    data: AcceptWorkspaceInviteRequest,
    user: GrpcUser,
  ): Promise<WorkspaceMembershipResponse> {
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
        .where(
          and(
            eq(workspaceInvites.token, data.token),
            eq(workspaceInvites.status, 'pending'),
          ),
        )
        .limit(1);

      if (!invite) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Invite not found',
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

      const memberChecker =
        await this.checkWorkspaceMember.checkWorkspaceMember({
          workspaceId: invite.workspace_invites.workspaceId,
          userId: user.id,
        });

      if (memberChecker?.authzRoleId) {
        throw new RpcException({
          code: GrpcStatus.ALREADY_EXISTS,
          message: 'User is already a member of this workspace',
        });
      }

      const [membership] = await tx
        .insert(workspaceMembers)
        .values({
          workspaceId: invite.workspace_invites.workspaceId,
          userId: user.id,
          authzRoleId: invite.workspace_invites.authzRoleId,
          joinedAt: new Date(),
        })
        .returning();

      const [acceptedInvite] = await tx
        .update(workspaceInvites)
        .set({
          status: 'accepted',
        })
        .where(
          and(
            eq(workspaceInvites.token, data.token),
            eq(workspaceInvites.status, 'pending'),
          ),
        )
        .returning();

      if (!acceptedInvite) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Invite not found or already used',
        });
      }

      return {
        membershipId: membership.id,
        workspaceId: membership.workspaceId,
        userId: membership.userId,
        authzRoleId: membership.authzRoleId,
        joinedAt: (membership.joinedAt as Date).toISOString(),
      };
    });
  }

  private validateInput(data: AcceptWorkspaceInviteRequest): void {
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

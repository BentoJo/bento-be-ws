import { Injectable } from '@nestjs/common';
import {
  InviteWorkspaceMemberRequest,
  WorkspaceInviteResponse,
} from '../types';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import {
  validateEmail,
  validateRequired,
  validateUUID,
} from '../../../../shared/validations';
import db from '../../../../shared/configs/db.config';
import { workspaceInvites, workspaces } from '../../../../shared/db/schema';
import { eq } from 'drizzle-orm';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../../authz/authz.service';
import { generateSecureToken } from '../utils/generate-token.util';
import { inviteHtml } from '../utils/invite-html';
import { sendEmail } from '../utils/ses.config';

@Injectable()
export class InviteWorkspaceMemberService {
  constructor(
    private readonly checkWorkspaceMember: WorkspaceMembersFuncs,
    private readonly authZ: AuthzService,
  ) {}
  async inviteWorkspaceMember(
    data: InviteWorkspaceMemberRequest,
    user: GrpcUser,
  ): Promise<WorkspaceInviteResponse> {
    // Validation
    this.validateInput(data);

    return db.transaction(async (tx) => {
      const [workspace] = await tx
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

      const memberChecker =
        await this.checkWorkspaceMember.checkWorkspaceMember({
          workspaceId: data.workspaceId,
          userId: user.id,
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
          permission: 'workspace:member:manage',
        }),
      );

      if (!perm?.allowed) {
        throw new RpcException({
          code: GrpcStatus.PERMISSION_DENIED,
          message: 'Permission denied to manage workspace members',
        });
      }

      const token = generateSecureToken();

      const [invite] = await tx
        .insert(workspaceInvites)
        .values({
          workspaceId: data.workspaceId,
          email: data.email,
          authzRoleId: data.authzRoleId,
          invitedBy: user.id,
          token: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        })
        .returning();

      if (!invite) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: 'Failed to create workspace invite',
        });
      }

      const url = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;
      const subject =
        'Workspace Invitation - You have been invited to join a workspace';
      const htmlContent = inviteHtml
        .replace('{{url}}', url)
        .replace('{{email}}', data.email);

      await sendEmail(data.email, subject, htmlContent).catch(console.error);

      return {
        inviteId: invite.id,
        authzRoleId: invite.authzRoleId,
        email: invite.email,
        expiresAt: invite.expiresAt,
        invitedBy: invite.invitedBy,
        token: invite.token,
        workspaceId: invite.workspaceId,
        createdAt: invite.createdAt || new Date(),
        status: 'PENDING',
      };
    });
  }

  private validateInput(data: InviteWorkspaceMemberRequest): void {
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

    const emailResult = validateRequired(data.email, 'Email');
    if (!emailResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: emailResult.message,
      });
    }

    const authzRoleIdResult = validateRequired(
      data.authzRoleId,
      'Authorization Role ID',
    );
    if (!authzRoleIdResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: authzRoleIdResult.message,
      });
    }

    const authzRoleIdUUIDResult = validateUUID(
      data.authzRoleId,
      'Authorization Role ID',
    );
    if (!authzRoleIdUUIDResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: authzRoleIdUUIDResult.message,
      });
    }

    const emailRegex = validateEmail(data.email);
    if (!emailRegex.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: emailRegex.message,
      });
    }
  }
}

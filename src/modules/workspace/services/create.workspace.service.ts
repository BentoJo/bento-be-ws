import { Injectable } from '@nestjs/common';
import { validateName, validateRequired } from '../../../shared/validations';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Logger } from '@nestjs/common';
import db from '../../../shared/configs/db.config';
import { CreateWorkspaceRequest, WorkspaceResponse } from '../types';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { AuthzService } from '../../authz/authz.service';
import { firstValueFrom } from 'rxjs';
import { workspaceMembers, workspaceRoles } from '../../../shared/db/schema';

@Injectable()
export class CreateWorkspaceService {
  private readonly logger = new Logger(CreateWorkspaceService.name);

  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly authZ: AuthzService,
  ) {}

  async createWorkspace(
    data: CreateWorkspaceRequest,
    user: GrpcUser,
  ): Promise<WorkspaceResponse> {
    //Validation
    this.validateInput(data);

    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required to create a workspace',
      });
    }

    const staticRoles = await firstValueFrom(this.authZ.getStaticRoles());

    const newWorkspace = await db.transaction(async (tx) => {
      const newWorkspace = await this.workspaceFuncs.create(
        {
          name: data.name,
          ownerUserId: user.id,
          createdBy: user.id,
          logoUrl: data.logoUrl ?? null,
          logoKey: null,
        },
        tx,
      );

      if (!newWorkspace) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: 'Failed to create workspace',
        });
      }

      if (staticRoles.roles.length === 0) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: 'No static roles found in authz service',
        });
      }

      await tx.insert(workspaceRoles).values(
        staticRoles.roles.map((role) => ({
          workspaceId: newWorkspace.id,
          authzRoleId: role.id,
          isSystem: true,
          createdBy: user.id,
        })),
      );

      const ownerRole = staticRoles.roles.find((r) => r.name === 'OWNER');
      if (!ownerRole) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: 'Owner role not found',
        });
      }

      await tx.insert(workspaceMembers).values({
        workspaceId: newWorkspace.id,
        userId: user.id,
        authzRoleId: ownerRole.id,
      });

      return {
        id: newWorkspace.id,
        name: newWorkspace.name,
        logoUrl: newWorkspace.logoUrl ?? undefined,
        ownerId: newWorkspace.ownerUserId,
        createdAt: newWorkspace.createdAt,
        updatedAt: newWorkspace.updatedAt ?? undefined,
      };
    });

    try {
      await firstValueFrom(
        this.authZ.createSystemRoles({
          scopeType: 'workspace',
          scopeId: newWorkspace.id,
          createdBy: user.id,
        }),
      );
    } catch (error) {
      const grpcError = error as { code?: number };

      if (grpcError.code === GrpcStatus.UNIMPLEMENTED) {
        this.logger.warn(
          'authz AuthorizationService.CreateSystemRoles is not implemented; skipping role bootstrap',
        );
      } else {
        throw error;
      }
    }

    return newWorkspace;
  }

  private validateInput(data: CreateWorkspaceRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    const requiredResult = validateRequired(data.name, 'Name');
    if (!requiredResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: requiredResult.message,
      });
    }

    const nameResult = validateName(data.name, 'Name');
    if (!nameResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: nameResult.message,
      });
    }
  }
}

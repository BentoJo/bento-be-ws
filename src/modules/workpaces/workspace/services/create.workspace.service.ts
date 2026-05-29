import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Logger } from '@nestjs/common';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { AuthzService } from '../../../authz/authz.service';
import { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import { CreateWorkspaceRequest, WorkspaceResponse } from '../types';
import { workspaceMembers, workspaceRoles } from '../../../../shared/db/schema';
import db from '../../../../shared/configs/db.config';
import { firstValueFrom } from 'rxjs';
import { validateName, validateRequired } from '../../../../shared/validations';

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

    const newWorkspace = await this.workspaceFuncs.create({
      name: data.name,
      ownerUserId: user.id,
      createdBy: user.id,
      logoUrl: data.logoUrl ?? null,
      logoKey: null,
    });

    const authz = await firstValueFrom(
      this.authZ.createSystemRoles({
        scopeType: 'workspace',
        scopeId: newWorkspace.id,
        createdBy: user.id,
      }),
    );

    if (!authz || !authz.roles) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to create system roles for workspace',
      });
    }

    if (!newWorkspace) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to create workspace',
      });
    }

    const staticRolesResponse = await firstValueFrom(
      this.authZ.getStaticRoles({
        scopeId: newWorkspace.id,
      }),
    );
    const staticRoles = staticRolesResponse?.roles ?? [];

    if (staticRoles.length === 0) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'No static roles found in authz service',
      });
    }

    await db.insert(workspaceRoles).values(
      staticRoles.map((role) => ({
        workspaceId: newWorkspace.id,
        authzRoleId: role.id,
        isSystem: true,
        createdBy: user.id,
      })),
    );

    const ownerRole = staticRoles.find((r) => r.name === 'OWNER');
    if (!ownerRole) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Owner role not found',
      });
    }

    await db.insert(workspaceMembers).values({
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

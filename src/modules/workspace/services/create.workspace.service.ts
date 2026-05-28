import { Injectable } from '@nestjs/common';
import { validateName, validateRequired } from '../../../shared/validations';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import db from '../../../shared/configs/db.config';
import { CreateWorkspaceRequest, WorkspaceResponse } from '../types';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { AuthzService } from '../../authz/authz.service';

@Injectable()
export class CreateWorkspaceService {
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

    return await db.transaction(async (tx) => {
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

      return {
        id: newWorkspace.id,
        name: newWorkspace.name,
        logoUrl: newWorkspace.logoUrl ?? undefined,
        ownerId: newWorkspace.ownerUserId,
        createdAt: newWorkspace.createdAt,
        updatedAt: newWorkspace.updatedAt ?? undefined,
      };
    });
  }

  private validateInput(data: CreateWorkspaceRequest): void {
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

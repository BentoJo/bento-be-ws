import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../shared/func/board';
import { CardFuncs } from '../../../shared/func/card';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { cardPriorityEnum } from '../../../shared/db/schema';
import {
  validateEnum,
  validateRequired,
  validateStringLength,
  validateUUID,
} from '../../../shared/validations';
import type { CardResponse, CreateCardRequest } from '../types';
import { CommonFuncs } from '../../../shared/func/common';
import { AuthzService } from '../../authz/authz.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CreateCardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly cardFuncs: CardFuncs,
    private readonly authZ: AuthzService,
    private readonly commonFuncs: CommonFuncs,
  ) {}

  async createCard(
    data: CreateCardRequest,
    user: GrpcUser,
  ): Promise<CardResponse> {
    this.validateInput(data);

    const result = await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: result.member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:card:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const position =
      data.position ?? (await this.cardFuncs.nextColumnPosition(data.columnId));

    const card = await this.cardFuncs.create({
      workspaceId: data.workspaceId,
      boardId: data.boardId,
      columnId: data.columnId,
      title: data.title,
      descriptionText: data.descriptionText ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      isPrivate: data.isPrivate,
      position,
      createdBy: user.id,
    });

    return this.commonFuncs.toCardResponse(card);
  }

  private validateInput(data: CreateCardRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    for (const [value, name] of [
      [data.workspaceId, 'Workspace ID'],
      [data.boardId, 'Board ID'],
      [data.columnId, 'Column ID'],
    ] as const) {
      const result = validateUUID(value, name);
      if (!result.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: result.message,
        });
      }
    }

    const titleRequired = validateRequired(data.title, 'Title');
    if (!titleRequired.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: titleRequired.message,
      });
    }

    const titleLength = validateStringLength(data.title, 1, 500, 'Title');
    if (!titleLength.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: titleLength.message,
      });
    }

    if (data.priority !== undefined) {
      const priorityResult = validateEnum(
        data.priority,
        cardPriorityEnum.enumValues,
        'Priority',
      );
      if (!priorityResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: priorityResult.message,
        });
      }
    }
  }
}

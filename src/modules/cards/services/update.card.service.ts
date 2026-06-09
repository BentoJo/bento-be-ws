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
  validateStringLength,
  validateUUID,
} from '../../../shared/validations';
import type { CardResponse, UpdateCardRequest } from '../types';
import { CommonFuncs } from '../../../shared/func/common';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../authz/authz.service';

@Injectable()
export class UpdateCardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly cardFuncs: CardFuncs,
    private readonly authZ: AuthzService,
    private readonly commonFuncs: CommonFuncs,
  ) {}

  async updateCard(
    data: UpdateCardRequest,
    user: GrpcUser,
  ): Promise<CardResponse> {
    this.validateInput(data);

    const result = await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const existing = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(
      existing,
      data.workspaceId,
      data.boardId,
    );

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: result.member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:cards:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const updated = await this.cardFuncs.update(data.cardId, {
      title: data.title,
      descriptionText: data.descriptionText,
      startDate:
        data.startDate !== undefined
          ? data.startDate
            ? new Date(data.startDate)
            : null
          : undefined,
      dueDate:
        data.dueDate !== undefined
          ? data.dueDate
            ? new Date(data.dueDate)
            : null
          : undefined,
      priority: data.priority,
      isCompleted: data.isCompleted,
      progress: data.progress,
      isPrivate: data.isPrivate,
    });

    if (!updated) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to update card',
      });
    }

    return this.commonFuncs.toCardResponse(updated);
  }

  private validateInput(data: UpdateCardRequest): void {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    for (const [value, name] of [
      [data.workspaceId, 'Workspace ID'],
      [data.boardId, 'Board ID'],
      [data.cardId, 'Card ID'],
    ] as const) {
      const result = validateUUID(value, name);
      if (!result.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: result.message,
        });
      }
    }

    if (data.title !== undefined) {
      const titleLength = validateStringLength(data.title, 1, 500, 'Title');
      if (!titleLength.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: titleLength.message,
        });
      }
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

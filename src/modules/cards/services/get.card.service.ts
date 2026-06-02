import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../shared/func/board';
import { CardFuncs } from '../../../shared/func/card';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { validateUUID } from '../../../shared/validations';
import type { CardResponse, GetCardRequest } from '../types';
import {
  assertCardInBoard,
  resolveBoardContext,
  toCardResponse,
} from './card-access';

@Injectable()
export class GetCardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly cardFuncs: CardFuncs,
  ) {}

  async getCard(data: GetCardRequest, user: GrpcUser): Promise<CardResponse> {
    this.validateInput(data);

    await resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    assertCardInBoard(card, data.workspaceId, data.boardId);

    return toCardResponse(card);
  }

  private validateInput(data: GetCardRequest): void {
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
  }
}

import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../shared/func/board';
import { CardCommentRow, CardFuncs } from '../../../shared/func/card';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import {
  validateRequired,
  validateStringLength,
  validateUUID,
} from '../../../shared/validations';
import type { ActionResponse } from '../../../shared/types/genereal';
import type {
  AddCommentRequest,
  CommentResponse,
  DeleteCommentRequest,
  ListCardCommentsRequest,
  ListCommentsResponse,
} from '../types';
import { CommonFuncs } from '../../../shared/func/common';
import { firstValueFrom } from 'rxjs';
import { AuthzService } from '../../authz/authz.service';

@Injectable()
export class CommentsCardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly cardFuncs: CardFuncs,
    private readonly authz: AuthzService,
    private readonly commonFuncs: CommonFuncs,
  ) {}

  async addComment(
    data: AddCommentRequest,
    user: GrpcUser,
  ): Promise<CommentResponse> {
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
      this.requireUUID(value, name);
    }

    const contentRequired = validateRequired(data.contentText, 'Content');
    if (!contentRequired.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: contentRequired.message,
      });
    }

    const contentLength = validateStringLength(
      data.contentText,
      1,
      10000,
      'Content',
    );
    if (!contentLength.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: contentLength.message,
      });
    }

    const { member } = await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    if (data.parentCommentId) {
      const parent = await this.cardFuncs.getComment(data.parentCommentId);
      if (!parent || parent.cardId !== data.cardId) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: 'Parent comment not found',
        });
      }
    }

    const perm = await firstValueFrom(
      this.authz.checkPermission({
        roleId: member.authzRoleId,
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

    const comment = await this.cardFuncs.addComment({
      workspaceId: data.workspaceId,
      cardId: data.cardId,
      workspaceMemberId: member.id,
      contentText: data.contentText,
      parentCommentId: data.parentCommentId ?? null,
    });

    return this.toCommentResponse(comment);
  }

  async listCardComments(
    data: ListCardCommentsRequest,
    user: GrpcUser,
  ): Promise<ListCommentsResponse> {
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
      this.requireUUID(value, name);
    }

    await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    const page = data.page && data.page > 0 ? data.page : 1;
    const limit = data.limit && data.limit > 0 ? data.limit : 20;

    const { rows, total } = await this.cardFuncs.listComments(
      data.cardId,
      page,
      limit,
    );

    return {
      comments: rows.map((row) => this.toCommentResponse(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  async deleteComment(
    data: DeleteCommentRequest,
    user: GrpcUser,
  ): Promise<ActionResponse> {
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
      [data.commentId, 'Comment ID'],
    ] as const) {
      this.requireUUID(value, name);
    }

    await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    const comment = await this.cardFuncs.getComment(data.commentId);
    if (!comment || comment.cardId !== data.cardId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Comment not found',
      });
    }

    await this.cardFuncs.deleteComment(data.commentId);

    return { success: true, message: 'Comment deleted successfully' };
  }

  private toCommentResponse(comment: CardCommentRow): CommentResponse {
    return {
      id: comment.id,
      workspaceId: comment.workspaceId,
      cardId: comment.cardId,
      parentCommentId: comment.parentCommentId ?? null,
      workspaceMemberId: comment.workspaceMemberId,
      contentText: comment.contentText ?? null,
      createdAt: comment.createdAt
        ? comment.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: comment.updatedAt ? comment.updatedAt.toISOString() : null,
    };
  }

  private requireUUID(value: string, name: string): void {
    const result = validateUUID(value, name);
    if (!result.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: result.message,
      });
    }
  }
}

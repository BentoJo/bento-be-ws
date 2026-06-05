import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../shared/func/board';
import { CardFuncs } from '../../../shared/func/card';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { assigneeTypeEnum } from '../../../shared/db/schema';
import { validateEnum, validateUUID } from '../../../shared/validations';
import type { ActionResponse } from '../../../shared/types/genereal';
import type {
  AddCardAssigneeRequest,
  CardAssignee,
  ListCardAssigneesRequest,
  ListCardAssigneesResponse,
  RemoveCardAssigneeRequest,
} from '../types';
import { AuthzService } from '../../authz/authz.service';
import { firstValueFrom } from 'rxjs';
import { CommonFuncs } from '../../../shared/func/common';

@Injectable()
export class AssigneesCardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly cardFuncs: CardFuncs,
    private readonly authZ: AuthzService,
    private readonly commonFuncs: CommonFuncs,
  ) {}

  async addCardAssignee(
    data: AddCardAssigneeRequest,
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
    ] as const) {
      this.requireUUID(value, name);
    }

    const typeResult = validateEnum(
      data.assigneeType,
      assigneeTypeEnum.enumValues,
      'Assignee type',
    );
    if (!typeResult.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: typeResult.message,
      });
    }

    if (data.assigneeType === 'member' && !data.boardMemberId) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'boardMemberId is required for member assignees',
      });
    }

    if (data.assigneeType === 'team' && !data.teamId) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'teamId is required for team assignees',
      });
    }

    const result = await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: result.member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:card_assignees:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    await this.cardFuncs.addAssignee({
      workspaceId: data.workspaceId,
      cardId: data.cardId,
      assigneeType: data.assigneeType,
      boardMemberId: data.assigneeType === 'member' ? data.boardMemberId : null,
      teamId: data.assigneeType === 'team' ? data.teamId : null,
      assignedBy: user.id,
    });

    return { success: true, message: 'Assignee added successfully' };
  }

  async removeCardAssignee(
    data: RemoveCardAssigneeRequest,
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
      [data.assigneeId, 'Assignee ID'],
    ] as const) {
      this.requireUUID(value, name);
    }

    const result = await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: result.member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:card_assignees:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    await this.cardFuncs.removeAssignee(data.cardId, data.assigneeId);

    return { success: true, message: 'Assignee removed successfully' };
  }

  async listCardAssignees(
    data: ListCardAssigneesRequest,
    user: GrpcUser,
  ): Promise<ListCardAssigneesResponse> {
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

    const result = await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: result.member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:card_assignees:read',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    const rows = await this.cardFuncs.listAssignees(data.cardId);

    const assignees: CardAssignee[] = rows.map((row) => ({
      id: row.id,
      cardId: row.cardId,
      assigneeType: row.assigneeType,
      boardMemberId: row.boardMemberId ?? null,
      teamId: row.teamId ?? null,
      assignedBy: row.assignedBy,
      createdAt: row.createdAt
        ? row.createdAt.toISOString()
        : new Date().toISOString(),
    }));

    return { assignees };
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

import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../shared/func/board';
import {
  CardChecklistItemRow,
  CardChecklistRow,
  CardFuncs,
} from '../../../shared/func/card';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import {
  validateRequired,
  validateStringLength,
  validateUUID,
} from '../../../shared/validations';
import type { ActionResponse } from '../../../shared/types/genereal';
import type {
  AddChecklistItemRequest,
  ChecklistItemResponse,
  ChecklistResponse,
  CreateChecklistRequest,
  DeleteChecklistItemRequest,
  DeleteChecklistRequest,
  ListCardChecklistsRequest,
  ListChecklistsResponse,
  ToggleChecklistItemRequest,
} from '../types';
import { CommonFuncs } from '../../../shared/func/common';
import { AuthzService } from '../../authz/authz.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChecklistsCardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly cardFuncs: CardFuncs,
    private readonly authz: AuthzService,
    private readonly commonFuncs: CommonFuncs,
  ) {}

  async createChecklist(
    data: CreateChecklistRequest,
    user: GrpcUser,
  ): Promise<ChecklistResponse> {
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

    this.requireTitle(data.title);

    const { member } = await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    const perm = await firstValueFrom(
      this.authz.checkPermission({
        roleId: member.authzRoleId,
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

    const position =
      data.position ??
      (await this.cardFuncs.nextChecklistPosition(data.cardId));

    const checklist = await this.cardFuncs.createChecklist({
      workspaceId: data.workspaceId,
      cardId: data.cardId,
      title: data.title,
      position,
      createdBy: member.userId,
    });

    return this.toChecklistResponse(checklist, []);
  }

  async addChecklistItem(
    data: AddChecklistItemRequest,
    user: GrpcUser,
  ): Promise<ChecklistItemResponse> {
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
      [data.checklistId, 'Checklist ID'],
    ] as const) {
      this.requireUUID(value, name);
    }

    this.requireTitle(data.title);

    await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    const checklist = await this.cardFuncs.getChecklist(data.checklistId);
    if (!checklist || checklist.cardId !== data.cardId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Checklist not found',
      });
    }

    const position =
      data.position ??
      (await this.cardFuncs.nextChecklistItemPosition(data.checklistId));

    const item = await this.cardFuncs.addChecklistItem({
      workspaceId: data.workspaceId,
      checklistId: data.checklistId,
      title: data.title,
      position,
    });

    await this.recomputeCardProgress(data.cardId);

    return this.toChecklistItemResponse(item);
  }

  async toggleChecklistItem(
    data: ToggleChecklistItemRequest,
    user: GrpcUser,
  ): Promise<ChecklistItemResponse> {
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
      [data.checklistId, 'Checklist ID'],
      [data.itemId, 'Item ID'],
    ] as const) {
      this.requireUUID(value, name);
    }

    const { member } = await this.commonFuncs.resolveBoardContext(data, user, {
      workspaceFuncs: this.workspaceFuncs,
      workspaceMembers: this.workspaceMembers,
      boardFuncs: this.boardFuncs,
    });

    const card = await this.cardFuncs.getActiveCard(data.cardId);
    this.commonFuncs.assertCardInBoard(card, data.workspaceId, data.boardId);

    const item = await this.cardFuncs.getChecklistItem(data.itemId);
    if (!item || item.checklistId !== data.checklistId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Checklist item not found',
      });
    }

    const updated = await this.cardFuncs.toggleChecklistItem(
      data.itemId,
      data.isCompleted,
      member.userId,
    );

    if (!updated) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: 'Failed to toggle checklist item',
      });
    }

    await this.recomputeCardProgress(data.cardId);

    return this.toChecklistItemResponse(updated);
  }

  async listCardChecklists(
    data: ListCardChecklistsRequest,
    user: GrpcUser,
  ): Promise<ListChecklistsResponse> {
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

    const checklists = await this.cardFuncs.listChecklists(data.cardId);

    const result: ChecklistResponse[] = [];
    for (const checklist of checklists) {
      const items = await this.cardFuncs.listChecklistItems(checklist.id);
      result.push(this.toChecklistResponse(checklist, items));
    }

    return { checklists: result };
  }

  async deleteChecklist(
    data: DeleteChecklistRequest,
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
      [data.checklistId, 'Checklist ID'],
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

    const checklist = await this.cardFuncs.getChecklist(data.checklistId);
    if (!checklist || checklist.cardId !== data.cardId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Checklist not found',
      });
    }

    await this.cardFuncs.deleteChecklist(data.checklistId);

    return { success: true, message: 'Checklist deleted successfully' };
  }

  async deleteChecklistItem(
    data: DeleteChecklistItemRequest,
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
      [data.checklistId, 'Checklist ID'],
      [data.itemId, 'Item ID'],
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

    const item = await this.cardFuncs.getChecklistItem(data.itemId);
    if (!item || item.checklistId !== data.checklistId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Checklist item not found',
      });
    }

    await this.cardFuncs.deleteChecklistItem(data.itemId);

    await this.recomputeCardProgress(data.cardId);

    return { success: true, message: 'Checklist item deleted successfully' };
  }

  /**
   * Recompute the card's `progress` (0-100) from its checklist completion and
   * persist it, so the board column card reflects checklist progress without
   * needing to load the checklists itself.
   */
  private async recomputeCardProgress(cardId: string): Promise<void> {
    const checklists = await this.cardFuncs.listChecklists(cardId);
    let total = 0;
    let done = 0;
    for (const cl of checklists) {
      const items = await this.cardFuncs.listChecklistItems(cl.id);
      total += items.length;
      done += items.filter((i) => i.isCompleted).length;
    }
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    await this.cardFuncs.update(cardId, { progress: String(pct) });
  }

  private toChecklistResponse(
    checklist: CardChecklistRow,
    items: CardChecklistItemRow[],
  ): ChecklistResponse {
    return {
      id: checklist.id,
      workspaceId: checklist.workspaceId,
      cardId: checklist.cardId,
      title: checklist.title,
      position: Number(checklist.position),
      createdBy: checklist.createdBy,
      createdAt: checklist.createdAt
        ? checklist.createdAt.toISOString()
        : new Date().toISOString(),
      items: items.map((item) => this.toChecklistItemResponse(item)),
    };
  }

  private toChecklistItemResponse(
    item: CardChecklistItemRow,
  ): ChecklistItemResponse {
    return {
      id: item.id,
      workspaceId: item.workspaceId,
      checklistId: item.checklistId,
      title: item.title,
      isCompleted: item.isCompleted ?? false,
      position: Number(item.position),
      completedBy: item.completedBy ?? null,
      completedAt: item.completedAt ? item.completedAt.toISOString() : null,
      createdAt: item.createdAt
        ? item.createdAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private requireTitle(title: string): void {
    const required = validateRequired(title, 'Title');
    if (!required.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: required.message,
      });
    }

    const length = validateStringLength(title, 1, 500, 'Title');
    if (!length.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: length.message,
      });
    }
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

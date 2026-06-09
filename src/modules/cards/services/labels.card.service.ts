import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { BoardFuncs } from '../../../shared/func/board';
import { CardFuncs, LabelRow } from '../../../shared/func/card';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { labelTypeEnum } from '../../../shared/db/schema';
import {
  validateEnum,
  validateRequired,
  validateStringLength,
  validateUUID,
} from '../../../shared/validations';
import type { ActionResponse } from '../../../shared/types/genereal';
import type {
  AddCardLabelRequest,
  CreateLabelRequest,
  DeleteLabelRequest,
  LabelResponse,
  ListLabelsResponse,
  ListWorkspaceLabelsRequest,
  RemoveCardLabelRequest,
} from '../types';
import { CommonFuncs } from '../../../shared/func/common';
import { AuthzService } from '../../authz/authz.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LabelsCardService {
  constructor(
    private readonly workspaceFuncs: WorkspaceFuncs,
    private readonly workspaceMembers: WorkspaceMembersFuncs,
    private readonly boardFuncs: BoardFuncs,
    private readonly cardFuncs: CardFuncs,
    private readonly authZ: AuthzService,
    private readonly commonFuncs: CommonFuncs,
  ) {}

  async createLabel(
    data: CreateLabelRequest,
    user: GrpcUser,
  ): Promise<LabelResponse> {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.requireUUID(data.workspaceId, 'Workspace ID');

    const nameRequired = validateRequired(data.name, 'Name');
    if (!nameRequired.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: nameRequired.message,
      });
    }

    const nameLength = validateStringLength(data.name, 1, 100, 'Name');
    if (!nameLength.valid) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: nameLength.message,
      });
    }

    if (data.type !== undefined) {
      const typeResult = validateEnum(
        data.type,
        labelTypeEnum.enumValues,
        'Type',
      );
      if (!typeResult.valid) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: typeResult.message,
        });
      }
    }

    const member = await this.requireWorkspaceMember(data.workspaceId, user);

    const perm = await firstValueFrom(
      this.authZ.checkPermission({
        roleId: member.authzRoleId,
        scopeId: data.workspaceId,
        permission: 'workspace:cards:manage',
      }),
    );

    if (!perm?.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'You do not have permission to view this card',
      });
    }

    const label = await this.cardFuncs.createLabel({
      workspaceId: data.workspaceId,
      name: data.name,
      icon: data.icon ?? null,
      type: data.type,
      createdBy: member.userId,
    });

    return this.toLabelResponse(label);
  }

  async listWorkspaceLabels(
    data: ListWorkspaceLabelsRequest,
    user: GrpcUser,
  ): Promise<ListLabelsResponse> {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.requireUUID(data.workspaceId, 'Workspace ID');

    await this.requireWorkspaceMember(data.workspaceId, user);

    const rows = await this.cardFuncs.listWorkspaceLabels(data.workspaceId);

    return { labels: rows.map((row) => this.toLabelResponse(row)) };
  }

  async deleteLabel(
    data: DeleteLabelRequest,
    user: GrpcUser,
  ): Promise<ActionResponse> {
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Request body is required',
      });
    }

    this.requireUUID(data.workspaceId, 'Workspace ID');
    this.requireUUID(data.labelId, 'Label ID');

    await this.requireWorkspaceMember(data.workspaceId, user);

    const label = await this.cardFuncs.getLabel(data.labelId);

    if (!label || label.workspaceId !== data.workspaceId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Label not found',
      });
    }

    await this.cardFuncs.deleteLabel(data.labelId);

    return { success: true, message: 'Label deleted successfully' };
  }

  async addCardLabel(
    data: AddCardLabelRequest,
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
      [data.labelId, 'Label ID'],
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

    const label = await this.cardFuncs.getLabel(data.labelId);
    if (!label || label.workspaceId !== data.workspaceId) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Label not found',
      });
    }

    await this.cardFuncs.addCardLabel({
      workspaceId: data.workspaceId,
      cardId: data.cardId,
      labelId: data.labelId,
    });

    return { success: true, message: 'Label added to card successfully' };
  }

  async removeCardLabel(
    data: RemoveCardLabelRequest,
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
      [data.labelId, 'Label ID'],
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

    await this.cardFuncs.removeCardLabel(data.cardId, data.labelId);

    return { success: true, message: 'Label removed from card successfully' };
  }

  private async requireWorkspaceMember(workspaceId: string, user: GrpcUser) {
    if (!user?.id) {
      throw new RpcException({
        code: GrpcStatus.UNAUTHENTICATED,
        message: 'User context is required',
      });
    }

    const workspace = await this.workspaceFuncs.findByIdActive(workspaceId);
    if (!workspace) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Workspace not found',
      });
    }

    const member = await this.workspaceMembers.getWorkspaceMember(
      workspaceId,
      user.id,
    );

    if (!member || !member.isActive) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Not a workspace member',
      });
    }

    return member;
  }

  private toLabelResponse(label: LabelRow): LabelResponse {
    return {
      id: label.id,
      workspaceId: label.workspaceId,
      name: label.name,
      icon: label.icon ?? null,
      type: label.type ?? 'default',
      createdBy: label.createdBy,
      createdAt: label.createdAt
        ? label.createdAt.toISOString()
        : new Date().toISOString(),
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

import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { GrpcUser } from '../../shared/decorators/meta.decorator';
import { CreateCardService } from './services/create.card.service';
import { GetCardService } from './services/get.card.service';
import { UpdateCardService } from './services/update.card.service';
import { DeleteCardService } from './services/delete.card.service';
import { RestoreCardService } from './services/restore.card.service';
import { ArchiveCardService } from './services/archive.card.service';
import { MoveCardService } from './services/move.card.service';
import { ListCardsService } from './services/list.cards.service';
import { AssigneesCardService } from './services/assignees.card.service';
import { LabelsCardService } from './services/labels.card.service';
import { CommentsCardService } from './services/comments.card.service';
import { ChecklistsCardService } from './services/checklists.card.service';
import type {
  AddCardAssigneeRequest,
  AddCardLabelRequest,
  AddChecklistItemRequest,
  AddCommentRequest,
  ArchiveCardRequest,
  CardResponse,
  ChecklistItemResponse,
  ChecklistResponse,
  CommentResponse,
  CreateCardRequest,
  CreateChecklistRequest,
  CreateLabelRequest,
  DeleteCardRequest,
  DeleteChecklistItemRequest,
  DeleteChecklistRequest,
  DeleteCommentRequest,
  DeleteLabelRequest,
  GetCardRequest,
  LabelResponse,
  ListBoardCardsRequest,
  ListCardAssigneesRequest,
  ListCardAssigneesResponse,
  ListCardChecklistsRequest,
  ListCardCommentsRequest,
  ListCardsResponse,
  ListChecklistsResponse,
  ListColumnCardsRequest,
  ListCommentsResponse,
  ListLabelsResponse,
  ListWorkspaceCardsByDateRequest,
  ListWorkspaceLabelsRequest,
  MoveCardRequest,
  RemoveCardAssigneeRequest,
  RemoveCardLabelRequest,
  RestoreCardRequest,
  ToggleChecklistItemRequest,
  UpdateCardRequest,
} from './types';
import type { ActionResponse } from '../../shared/types/genereal';

@Controller()
export class CardsController {
  constructor(
    private readonly createCardService: CreateCardService,
    private readonly getCardService: GetCardService,
    private readonly updateCardService: UpdateCardService,
    private readonly deleteCardService: DeleteCardService,
    private readonly restoreCardService: RestoreCardService,
    private readonly archiveCardService: ArchiveCardService,
    private readonly moveCardService: MoveCardService,
    private readonly listCardsService: ListCardsService,
    private readonly assigneesCardService: AssigneesCardService,
    private readonly labelsCardService: LabelsCardService,
    private readonly commentsCardService: CommentsCardService,
    private readonly checklistsCardService: ChecklistsCardService,
  ) {}

  // ---------------------------
  // CARD CRUD
  // ---------------------------

  @GrpcMethod('CardService', 'CreateCard')
  createCard(
    @Payload() data: CreateCardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<CardResponse> {
    return this.createCardService.createCard(data, user);
  }

  @GrpcMethod('CardService', 'GetCard')
  getCard(
    @Payload() data: GetCardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<CardResponse> {
    return this.getCardService.getCard(data, user);
  }

  @GrpcMethod('CardService', 'UpdateCard')
  updateCard(
    @Payload() data: UpdateCardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<CardResponse> {
    return this.updateCardService.updateCard(data, user);
  }

  @GrpcMethod('CardService', 'DeleteCard')
  deleteCard(
    @Payload() data: DeleteCardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.deleteCardService.deleteCard(data, user);
  }

  @GrpcMethod('CardService', 'RestoreCard')
  restoreCard(
    @Payload() data: RestoreCardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.restoreCardService.restoreCard(data, user);
  }

  @GrpcMethod('CardService', 'ArchiveCard')
  archiveCard(
    @Payload() data: ArchiveCardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.archiveCardService.archiveCard(data, user);
  }

  @GrpcMethod('CardService', 'MoveCard')
  moveCard(
    @Payload() data: MoveCardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.moveCardService.moveCard(data, user);
  }

  @GrpcMethod('CardService', 'ListColumnCards')
  listColumnCards(
    @Payload() data: ListColumnCardsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListCardsResponse> {
    return this.listCardsService.listColumnCards(data, user);
  }

  @GrpcMethod('CardService', 'ListBoardCards')
  listBoardCards(
    @Payload() data: ListBoardCardsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListCardsResponse> {
    return this.listCardsService.listBoardCards(data, user);
  }

  @GrpcMethod('CardService', 'ListWorkspaceCardsByDate')
  listWorkspaceCardsByDate(
    @Payload() data: ListWorkspaceCardsByDateRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListCardsResponse> {
    return this.listCardsService.listWorkspaceCardsByDate(data, user);
  }

  // ---------------------------
  // ASSIGNEES
  // ---------------------------

  @GrpcMethod('CardService', 'AddCardAssignee')
  addCardAssignee(
    @Payload() data: AddCardAssigneeRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.assigneesCardService.addCardAssignee(data, user);
  }

  @GrpcMethod('CardService', 'RemoveCardAssignee')
  removeCardAssignee(
    @Payload() data: RemoveCardAssigneeRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.assigneesCardService.removeCardAssignee(data, user);
  }

  @GrpcMethod('CardService', 'ListCardAssignees')
  listCardAssignees(
    @Payload() data: ListCardAssigneesRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListCardAssigneesResponse> {
    return this.assigneesCardService.listCardAssignees(data, user);
  }

  // ---------------------------
  // LABELS
  // ---------------------------

  @GrpcMethod('CardService', 'AddCardLabel')
  addCardLabel(
    @Payload() data: AddCardLabelRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.labelsCardService.addCardLabel(data, user);
  }

  @GrpcMethod('CardService', 'RemoveCardLabel')
  removeCardLabel(
    @Payload() data: RemoveCardLabelRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.labelsCardService.removeCardLabel(data, user);
  }

  @GrpcMethod('CardService', 'CreateLabel')
  createLabel(
    @Payload() data: CreateLabelRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<LabelResponse> {
    return this.labelsCardService.createLabel(data, user);
  }

  @GrpcMethod('CardService', 'ListWorkspaceLabels')
  listWorkspaceLabels(
    @Payload() data: ListWorkspaceLabelsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListLabelsResponse> {
    return this.labelsCardService.listWorkspaceLabels(data, user);
  }

  @GrpcMethod('CardService', 'DeleteLabel')
  deleteLabel(
    @Payload() data: DeleteLabelRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.labelsCardService.deleteLabel(data, user);
  }

  // ---------------------------
  // COMMENTS
  // ---------------------------

  @GrpcMethod('CardService', 'AddComment')
  addComment(
    @Payload() data: AddCommentRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<CommentResponse> {
    return this.commentsCardService.addComment(data, user);
  }

  @GrpcMethod('CardService', 'ListCardComments')
  listCardComments(
    @Payload() data: ListCardCommentsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListCommentsResponse> {
    return this.commentsCardService.listCardComments(data, user);
  }

  @GrpcMethod('CardService', 'DeleteComment')
  deleteComment(
    @Payload() data: DeleteCommentRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.commentsCardService.deleteComment(data, user);
  }

  // ---------------------------
  // CHECKLISTS
  // ---------------------------

  @GrpcMethod('CardService', 'CreateChecklist')
  createChecklist(
    @Payload() data: CreateChecklistRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ChecklistResponse> {
    return this.checklistsCardService.createChecklist(data, user);
  }

  @GrpcMethod('CardService', 'AddChecklistItem')
  addChecklistItem(
    @Payload() data: AddChecklistItemRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ChecklistItemResponse> {
    return this.checklistsCardService.addChecklistItem(data, user);
  }

  @GrpcMethod('CardService', 'ToggleChecklistItem')
  toggleChecklistItem(
    @Payload() data: ToggleChecklistItemRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ChecklistItemResponse> {
    return this.checklistsCardService.toggleChecklistItem(data, user);
  }

  @GrpcMethod('CardService', 'ListCardChecklists')
  listCardChecklists(
    @Payload() data: ListCardChecklistsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListChecklistsResponse> {
    return this.checklistsCardService.listCardChecklists(data, user);
  }

  @GrpcMethod('CardService', 'DeleteChecklist')
  deleteChecklist(
    @Payload() data: DeleteChecklistRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.checklistsCardService.deleteChecklist(data, user);
  }

  @GrpcMethod('CardService', 'DeleteChecklistItem')
  deleteChecklistItem(
    @Payload() data: DeleteChecklistItemRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.checklistsCardService.deleteChecklistItem(data, user);
  }
}

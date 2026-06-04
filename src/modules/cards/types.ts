import type { cards, labels, cardAssignees } from '../../shared/db/schema';

export type CardPriority = NonNullable<(typeof cards.$inferSelect)['priority']>;

export type LabelType = NonNullable<(typeof labels.$inferSelect)['type']>;

export type AssigneeType = (typeof cardAssignees.$inferSelect)['assigneeType'];

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------
// CARD
// ---------------------------

export interface CreateCardRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
  title: string;
  descriptionText?: string;
  startDate?: string;
  dueDate?: string;
  priority?: CardPriority;
  isPrivate?: boolean;
  position?: number;
}

export interface GetCardRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
}

export interface UpdateCardRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  title?: string;
  descriptionText?: string;
  startDate?: string;
  dueDate?: string;
  priority?: CardPriority;
  isCompleted?: boolean;
  progress?: string;
  isPrivate?: boolean;
}

export interface DeleteCardRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
}

export interface RestoreCardRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
}

export interface ArchiveCardRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
}

export interface MoveCardRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  columnId: string;
  position: number;
}

export interface ListColumnCardsRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
  includeArchived?: boolean;
}

export interface ListBoardCardsRequest {
  workspaceId: string;
  boardId: string;
  includeArchived?: boolean;
}

export interface ListWorkspaceCardsByDateRequest {
  workspaceId: string;
  from: string;
  to: string;
}

export interface CardResponse {
  id: string;
  workspaceId: string;
  boardId: string;
  columnId: string;
  title: string;
  descriptionText?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority: CardPriority;
  isCompleted: boolean;
  progress: string;
  isPrivate: boolean;
  position: number;
  createdBy: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ListCardsResponse {
  cards: CardResponse[];
}

// ---------------------------
// ASSIGNEES
// ---------------------------

export interface AddCardAssigneeRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  assigneeType: AssigneeType;
  boardMemberId?: string;
  teamId?: string;
}

export interface RemoveCardAssigneeRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  assigneeId: string;
}

export interface ListCardAssigneesRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
}

export interface CardAssignee {
  id: string;
  cardId: string;
  assigneeType: AssigneeType;
  boardMemberId?: string | null;
  teamId?: string | null;
  assignedBy: string;
  createdAt: string;
}

export interface ListCardAssigneesResponse {
  assignees: CardAssignee[];
}

// ---------------------------
// LABELS
// ---------------------------

export interface CreateLabelRequest {
  workspaceId: string;
  name: string;
  icon?: string;
  type?: LabelType;
}

export interface LabelResponse {
  id: string;
  workspaceId: string;
  name: string;
  icon?: string | null;
  type: LabelType;
  createdBy: string;
  createdAt: string;
}

export interface ListWorkspaceLabelsRequest {
  workspaceId: string;
}

export interface ListLabelsResponse {
  labels: LabelResponse[];
}

export interface DeleteLabelRequest {
  workspaceId: string;
  labelId: string;
}

export interface AddCardLabelRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  labelId: string;
}

export interface RemoveCardLabelRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  labelId: string;
}

// ---------------------------
// COMMENTS
// ---------------------------

export interface AddCommentRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  contentText: string;
  parentCommentId?: string;
}

export interface CommentResponse {
  id: string;
  workspaceId: string;
  cardId: string;
  parentCommentId?: string | null;
  workspaceMemberId: string;
  contentText?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ListCardCommentsRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  page?: number;
  limit?: number;
}

export interface ListCommentsResponse {
  comments: CommentResponse[];
  pagination: PaginationMeta;
}

export interface DeleteCommentRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  commentId: string;
}

// ---------------------------
// CHECKLISTS
// ---------------------------

export interface CreateChecklistRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  title: string;
  position?: number;
}

export interface ChecklistItemResponse {
  id: string;
  workspaceId: string;
  checklistId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  completedBy?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface ChecklistResponse {
  id: string;
  workspaceId: string;
  cardId: string;
  title: string;
  position: number;
  createdBy: string;
  createdAt: string;
  items: ChecklistItemResponse[];
}

export interface AddChecklistItemRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  checklistId: string;
  title: string;
  position?: number;
}

export interface ToggleChecklistItemRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  checklistId: string;
  itemId: string;
  isCompleted: boolean;
}

export interface ListCardChecklistsRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
}

export interface ListChecklistsResponse {
  checklists: ChecklistResponse[];
}

export interface DeleteChecklistRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  checklistId: string;
}

export interface DeleteChecklistItemRequest {
  workspaceId: string;
  boardId: string;
  cardId: string;
  checklistId: string;
  itemId: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateColumnRequest {
  workspaceId: string;
  boardId: string;
  name: string;
  position?: number;
}

export interface GetColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
}

export interface UpdateColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
  name?: string;
}

export interface DeleteColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
}

export interface RestoreColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
}

export interface ArchiveColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
}

export interface UnarchiveColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
}

export interface ColumnResponse {
  id: string;
  workspaceId: string;
  boardId: string;
  name: string;
  position: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ListBoardColumnsRequest {
  workspaceId: string;
  boardId: string;
  includeArchived?: boolean;
}

export interface ColumnListItem {
  id: string;
  name: string;
  position: number;
  isArchived: boolean;
  cardsCount: number;
}

export interface ListBoardColumnsResponse {
  columns: ColumnListItem[];
}

export interface ReorderColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
  newPosition: number;
}

export interface ReorderedColumnItem {
  columnId: string;
  position: number;
}

export interface BulkReorderColumnsRequest {
  workspaceId: string;
  boardId: string;
  columns: ReorderedColumnItem[];
}

export interface WatchColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
}

export interface UnwatchColumnRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
}

export interface ListColumnWatchersRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
  page?: number;
  limit?: number;
}

export interface Watcher {
  userId: string;
  watchedAt: string;
}

export interface ListColumnWatchersResponse {
  watchers: Watcher[];
  pagination: PaginationMeta;
}

export interface ListColumnCardsRequest {
  workspaceId: string;
  boardId: string;
  columnId: string;
  page?: number;
  limit?: number;
}

export interface ColumnCardListItem {
  cardId: string;
  title: string;
  position: number;
  completed: boolean;
  dueDate?: string;
}

export interface ListColumnCardsResponse {
  cards: ColumnCardListItem[];
  pagination: PaginationMeta;
}

export interface MoveCardsBetweenColumnsRequest {
  workspaceId: string;
  boardId: string;
  sourceColumnId: string;
  targetColumnId: string;
  cardIds: string[];
}

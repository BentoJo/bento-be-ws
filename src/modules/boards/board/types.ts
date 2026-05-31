import type { boards } from '../../../shared/db/schema';

export type BoardVisibility = NonNullable<
  (typeof boards.$inferSelect)['visibility']
>;

export interface CreateBoardRequest {
  workspaceId: string;
  name: string;
  icon?: string;
  visibility?: BoardVisibility;
}

export interface UpdateBoardRequest {
  workspaceId: string;
  boardId: string;
  name?: string;
  icon?: string | null;
  visibility?: BoardVisibility;
}

export interface DeleteBoardRequest {
  workspaceId: string;
  boardId: string;
}

export interface RestoreBoardRequest {
  workspaceId: string;
  boardId: string;
}

export interface FavoriteBoardRequest {
  workspaceId: string;
  boardId: string;
}

export interface UnfavoriteBoardRequest {
  workspaceId: string;
  boardId: string;
}

export interface ArchiveBoardRequest {
  workspaceId: string;
  boardId: string;
}

export interface UnarchiveBoardRequest {
  workspaceId: string;
  boardId: string;
}

export interface ListFavoriteBoardsRequest {
  workspaceId: string;
  page?: number;
  limit?: number;
}

export interface FavoriteBoardListItem {
  boardId: string;
  name: string;
  icon?: string | null;
  isPrivate: boolean;
}

export interface ListFavoriteBoardsResponse {
  boards: FavoriteBoardListItem[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetBoardRequest {
  workspaceId: string;
  boardId: string;
}

export interface ListBoardsRequest {
  workspaceId: string;
}

export interface ListBoardsResponse {
  boards: BoardResponse[];
}

export interface BoardResponse {
  id: string;
  workspaceId: string;
  name: string;
  icon?: string | null;
  visibility: BoardVisibility;
  createdBy: string;
  createdAt: string;
}

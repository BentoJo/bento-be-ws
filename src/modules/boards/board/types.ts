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

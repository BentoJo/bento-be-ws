export interface CreateWorkspaceRequest {
  name: string;
  logoUrl?: string;
}

export interface UpdateWorkspaceRequest {
  workspaceId: string;

  name?: string;

  logoUrl?: string | null;

  logoKey?: string | null;
}

export interface GetWorkspaceOverviewRequest {
  workspaceId: string;
}

export type GetWorkspaceOverviewResponse = {
  totalBoards: number;
  totalMembers: number;
  totalTeams: number;
  totalCards: number;
  completedCards: number;
  overdueCards: number;
  boardsPreview: {
    id: string;
    name: string;
    visibility: string;
    columnsCount: number;
    cardCount: number;
  }[];
  permissions: {
    canCreateBoard: boolean;
    canInviteMembers: boolean;
    canEditWorkspace: boolean;
  };
  lastUpdatedAt: string;
};

export interface WorkspaceResponse {
  id: string;

  name: string;

  logoUrl?: string;

  ownerId: string;

  createdAt: string;

  updatedAt?: string;
}

export interface GetWorkspaceRequest {
  workspaceId: string;
}

export interface DeleteWorkspaceRequest {
  workspaceId: string;
}

export interface RestoreWorkspaceRequest {
  workspaceId: string;
}

export interface TransferWorkspaceOwnershipRequest {
  workspaceId: string;

  newOwnerId: string;
}

export interface ListUserWorkspacesRequest {
  page?: number;

  limit?: number;

  search?: string;

  includeArchived?: boolean;
}

export interface WorkspaceListItem {
  id: string;

  name: string;

  logoUrl?: string;

  isArchived: boolean;

  roleId: string;
}

export interface ListUserWorkspacesResponse {
  workspaces: WorkspaceListItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

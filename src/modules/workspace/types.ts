export interface CreateWorkspaceRequest {
  name: string;
  logoUrl?: string;
}

export interface WorkspaceResponse {
  id: string;

  name: string;

  logoUrl?: string;

  ownerId: string;

  createdAt: Date;

  updatedAt?: Date;
}

export interface GetWorkspaceRequest {
  workspaceId: string;
}

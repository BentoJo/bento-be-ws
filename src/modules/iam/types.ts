import type { Observable } from 'rxjs';

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  bio: string;
  phone: string;
  dob: string;
  gender: string;
  authStatus: string;
  globalRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersByIdsRequest {
  userIds: string[];
}

export interface GetUsersByIdsResponse {
  users: UserInfo[];
}

export interface GetUserByIdRequest {
  userId: string;
}

export type GetUserByIdResponse = UserInfo;

export interface UserServiceClient {
  GetUsersByIds(req: GetUsersByIdsRequest): Observable<GetUsersByIdsResponse>;
  GetUser(req: GetUserByIdRequest): Observable<GetUserByIdResponse>;
}

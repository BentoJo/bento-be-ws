import type { Observable } from 'rxjs';

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  bio: string | null;
  phone: string | null;
  dob: string | null;
  gender: string | null;
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

export interface GetUserByIdResponse {
  user?: UserInfo;
}

export interface UserServiceClient {
  getUsersByIds(req: GetUsersByIdsRequest): Observable<GetUsersByIdsResponse>;
  getUserById(req: GetUserByIdRequest): Observable<GetUserByIdResponse>;
}

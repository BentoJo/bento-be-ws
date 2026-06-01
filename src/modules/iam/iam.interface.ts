import { Observable } from 'rxjs';
import {
  GetUserByIdRequest,
  GetUserByIdResponse,
  GetUsersByIdsRequest,
  GetUsersByIdsResponse,
} from './types';

export interface IamService {
  getUsersByIds(
    request: GetUsersByIdsRequest,
  ): Observable<GetUsersByIdsResponse>;
  getUserById(request: GetUserByIdRequest): Observable<GetUserByIdResponse>;
}

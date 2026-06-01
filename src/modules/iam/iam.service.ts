import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import type { Observable } from 'rxjs';
import type {
  GetUserByIdRequest,
  GetUserByIdResponse,
  GetUsersByIdsRequest,
  GetUsersByIdsResponse,
  UserServiceClient,
} from './types';

@Injectable()
export class IamService implements OnModuleInit {
  private serviceClient?: UserServiceClient;

  constructor(@Inject('IAM_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.serviceClient =
      this.client.getService<UserServiceClient>('UserService');
  }

  private get service(): UserServiceClient {
    if (!this.serviceClient) {
      this.serviceClient =
        this.client.getService<UserServiceClient>('UserService');
    }

    return this.serviceClient;
  }

  getUsersByIds(req: GetUsersByIdsRequest): Observable<GetUsersByIdsResponse> {
    return this.service.getUsersByIds(req);
  }

  getUserById(req: GetUserByIdRequest): Observable<GetUserByIdResponse> {
    return this.service.getUserById(req);
  }
}

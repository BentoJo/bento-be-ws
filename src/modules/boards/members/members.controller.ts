import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';

import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import type {
  AddBoardMemberRequest,
  AddBoardMemberResponse,
  ListBoardMembersRequest,
  ListBoardMembersResponse,
  RemoveBoardMemberRequest,
  RemoveBoardMemberResponse,
} from './types';
import { AddBoardMemberService } from './services/add-board-member.service';
import { ListBoardMembersService } from './services/list-baord-members.service';
import { RemoveBoardMemberService } from './services/remove-board-member.service';

@Controller()
export class MembersController {
  constructor(
    private readonly addBoardMemberService: AddBoardMemberService,
    private readonly listBoardMembersService: ListBoardMembersService,
    private readonly removeBoardMemberService: RemoveBoardMemberService,
  ) {}

  @GrpcMethod('BoardMembersService', 'AddBoardMember')
  addBoardMember(
    @Payload() data: AddBoardMemberRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<AddBoardMemberResponse> {
    return this.addBoardMemberService.addBoardMember(data, user);
  }

  @GrpcMethod('BoardMembersService', 'RemoveBoardMember')
  removeBoardMember(
    @Payload() data: RemoveBoardMemberRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<RemoveBoardMemberResponse> {
    return this.removeBoardMemberService.removeBoardMember(data, user);
  }

  @GrpcMethod('BoardMembersService', 'ListBoardMembers')
  listBoardMembers(
    @Payload() data: ListBoardMembersRequest,
  ): Promise<ListBoardMembersResponse> {
    return this.listBoardMembersService.listBoardMembers(data);
  }
}

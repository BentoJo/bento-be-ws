import { Module } from '@nestjs/common';

import { AuthzModule } from '../../authz/authz.module';
import { IamModule } from '../../iam/iam.module';
import { BoardFuncs } from '../../../shared/func/board';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { MembersController } from './members.controller';
import { AddBoardMemberService } from './services/add-board-member.service';
import { ListBoardMembersService } from './services/list-baord-members.service';
import { RemoveBoardMemberService } from './services/remove-board-member.service';

@Module({
  imports: [AuthzModule, IamModule],
  controllers: [MembersController],
  providers: [
    WorkspaceFuncs,
    WorkspaceMembersFuncs,
    BoardFuncs,
    AddBoardMemberService,
    ListBoardMembersService,
    RemoveBoardMemberService,
  ],
})
export class MembersModule {}

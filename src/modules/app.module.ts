import { Module } from '@nestjs/common';
import { WorkspaceModule } from './workspaces/workspace/workspace.module';
import { MembersModule } from './workspaces/members/members.module';
import { WorkspaceRolesModule } from './workspaces/workspace-roles/workspace-roles.module';
import { TeamsModule } from './teams/teams.module';
import { BoardModule } from './boards/board/board.module';
import { ColumnsModule } from './columns/columns.module';
import { CardsModule } from './cards/cards.module';
import { AuthzModule } from './authz/authz.module';
import { MembersModule as BoardMembersModule } from './boards/members/members.module';

@Module({
  imports: [
    WorkspaceModule,
    MembersModule,
    WorkspaceRolesModule,
    TeamsModule,
    BoardModule,
    ColumnsModule,
    CardsModule,
    AuthzModule,
    BoardMembersModule,
  ],
})
export class AppModule {}

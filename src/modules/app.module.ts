import { Module } from '@nestjs/common';
import { WorkspaceModule } from './workpaces/workspace/workspace.module';
import { MembersModule } from './workpaces/members/members.module';
import { WorkspaceRolesModule } from './workpaces/workspace-roles/workspace-roles.module';
import { TeamsModule } from './teams/teams.module';
import { BoardModule } from './boards/board/board.module';
import { ColumnsModule } from './columns/columns.module';
import { CardsModule } from './cards/cards.module';

@Module({
  imports: [
    WorkspaceModule,
    MembersModule,
    WorkspaceRolesModule,
    TeamsModule,
    BoardModule,
    ColumnsModule,
    CardsModule,
  ],
})
export class AppModule {}

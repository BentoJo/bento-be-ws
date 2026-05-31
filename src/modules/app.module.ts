import { Module } from '@nestjs/common';
import { WorkspaceModule } from './workpaces/workspace/workspace.module';
import { MembersModule } from './workpaces/members/members.module';
import { WorkspaceRolesModule } from './workpaces/workspace-roles/workspace-roles.module';
import { TeamsModule } from './workpaces/teams/teams.module';
import { BoardModule } from './boards/board/board.module';

@Module({
  imports: [
    WorkspaceModule,
    MembersModule,
    WorkspaceRolesModule,
    TeamsModule,
    BoardModule,
  ],
})
export class AppModule {}

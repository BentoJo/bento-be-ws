import { Module } from '@nestjs/common';
import { WorkspaceModule } from './workpaces/workspace/workspace.module';
import { MembersModule } from './workpaces/members/members.module';
import { WorkspaceRolesModule } from './workpaces/workspace-roles/workspace-roles.module';
import { BoardModule } from './boards/board/board.module';

@Module({
  imports: [WorkspaceModule, MembersModule, WorkspaceRolesModule, BoardModule],
})
export class AppModule {}

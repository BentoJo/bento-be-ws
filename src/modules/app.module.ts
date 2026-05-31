import { Module } from '@nestjs/common';
import { WorkspaceModule } from './workpaces/workspace/workspace.module';
import { MembersModule } from './workpaces/members/members.module';
import { WorkspaceRolesModule } from './workpaces/workspace-roles/workspace-roles.module';

@Module({
  imports: [WorkspaceModule, MembersModule, WorkspaceRolesModule],
})
export class AppModule {}

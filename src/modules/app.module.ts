import { Module } from '@nestjs/common';
import { WorkspaceModule } from './workpaces/workspace/workspace.module';
import { MembersModule } from './workpaces/members/members.module';

@Module({
  imports: [WorkspaceModule, MembersModule],
})
export class AppModule {}

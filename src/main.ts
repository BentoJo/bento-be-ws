import 'dotenv/config';
import { AppModule } from './modules/app.module';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const grpcPort = process.env.GRPC_PORT || '50054';

  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: [
        'workspace',
        'workspaceMembers',
        'workspaceRoles',
        'board',
        'boardMembers',
        'teams',
        'columns',
        'cards',
        'authz',
      ],
      protoPath: [
        join(__dirname, '../src/shared/proto/workspace/workspace.proto'),
        join(
          __dirname,
          '../src/shared/proto/workspace/workspace-members.proto',
        ),
        join(__dirname, '../src/shared/proto/workspace/workspace-role.proto'),
        join(__dirname, '../src/shared/proto/board/board.proto'),
        join(__dirname, '../src/shared/proto/board/board-members.proto'),
        join(__dirname, '../src/shared/proto/teams/teams.proto'),
        join(__dirname, '../src/shared/proto/columns/columns.proto'),
        join(__dirname, '../src/shared/proto/cards/cards.proto'),
        join(__dirname, '../src/shared/proto/authz/authz.proto'),
      ],
      url: `0.0.0.0:${grpcPort}`,
      loader: {
        keepCase: true,
        defaults: true,
        longs: String,
      },
    },
  });

  // 3. Start both transports
  await app.startAllMicroservices();

  console.log(`Workspace gRPC microservice running on port ${grpcPort}`);
}
void bootstrap();

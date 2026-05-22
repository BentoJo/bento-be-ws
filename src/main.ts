import 'dotenv/config';
import { AppModule } from './modules/app.module';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const grpcPort = process.env.GRPC_PORT || '50052';

  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['workspace'],
      protoPath: [
        join(__dirname, '../src/shared/proto/workspa.proto'),
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

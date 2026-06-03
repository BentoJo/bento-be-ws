import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { IamService } from './iam.service';

const protoPath =
  process.env.IAM_PROTO_PATH ||
  join(process.cwd(), 'src/shared/proto/iam/iam.proto');
const url = process.env.IAM_URL || 'iam-service:50052';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'IAM_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath,
          url,
        },
      },
    ]),
  ],
  providers: [IamService],
  exports: [IamService],
})
export class IamModule {}

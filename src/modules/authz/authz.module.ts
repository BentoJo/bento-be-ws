import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AuthzService } from './authz.service';
import { RolesController } from './roles.controller';

const protoPath =
  process.env.AUTHZ_PROTO_PATH ||
  join(process.cwd(), 'src/shared/proto/authz/authz.proto');
const url = process.env.AUTHZ_URL || 'authz-service:50053';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTHORIZATION_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'authz',
          protoPath,
          url,
        },
      },
    ]),
  ],
  controllers: [RolesController],
  providers: [AuthzService],
  exports: [AuthzService],
})
export class AuthzModule {}

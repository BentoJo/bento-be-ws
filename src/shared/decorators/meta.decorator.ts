import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';

export interface GrpcUser {
  id: string;
  email: string;
}
export const GrpcUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GrpcUser => {
    const grpcCtx = ctx.switchToRpc();

    const metadata = grpcCtx.getContext<Metadata>();

    const userId = metadata.get('x-user-id')?.[0] as string;
    const email = metadata.get('x-user-email')?.[0] as string;

    return {
      id: userId,
      email,
    };
  },
);

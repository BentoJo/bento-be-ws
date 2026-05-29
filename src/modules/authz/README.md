Authz gRPC client module

Usage

- Place `authz.proto` near your build or set `AUTHZ_PROTO_PATH` to its path.
- Set `AUTHZ_URL` (e.g. `authz:50051` or `localhost:50051`).
- Import `AuthzModule` into your AppModule.

Example

1. Set env vars:

```
export AUTHZ_PROTO_PATH=/path/to/authz.proto
export AUTHZ_URL=authz:50051
```

2. Import module:

```ts
import { AuthzModule } from './shared/authz/authz.module';

@Module({ imports: [AuthzModule], })
export class AppModule {}
```

3. Inject `AuthzService` and call methods (they return Observables):

```ts
constructor(private readonly authz: AuthzService) {}

this.authz.healthCheck().subscribe(r => console.log(r));
```

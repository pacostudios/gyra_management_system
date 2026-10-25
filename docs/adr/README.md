# Architecture Decision Records

One file per decision: context, decision, consequences. Never rewrite an accepted ADR — supersede it with a new one.

| #                                         | Decision                                             | Status   |
| ----------------------------------------- | ---------------------------------------------------- | -------- |
| [0001](0001-modular-monolith.md)          | Modular monolith (web + api + worker)                | Accepted |
| [0002](0002-postgresql-over-mongodb.md)   | PostgreSQL with Prisma, JSONB for flexible fields    | Accepted |
| [0003](0003-bullmq-and-redis.md)          | BullMQ on Redis for background jobs                  | Accepted |
| [0004](0004-better-auth.md)               | Better Auth for authentication, custom authorization | Accepted |
| [0005](0005-single-ec2-hosting.md)        | One EC2 instance + RDS at launch                     | Accepted |
| [0006](0006-hierarchical-access-scope.md) | Role assignments + AccessScope for authorization     | Accepted |

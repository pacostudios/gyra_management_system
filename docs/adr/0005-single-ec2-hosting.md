# 0005 — One EC2 instance + RDS at launch

**Status:** Accepted

## Context

Hosting is in GYRA's own AWS account (MoU Schedule C.2) with a small first-year budget, and one person operates production. The MoU sets no specific load targets but expects the backend to scale.

## Decision

- Production: one EC2 instance running `web`, `api`, `worker`, `redis`, and Caddy via Docker Compose; RDS PostgreSQL; S3; SES; CloudFront.
- Staging: a second Compose project on the same instance with its own database, used for UAT (MoU 5.1).
- CI/CD: GitHub Actions builds images, pushes to ECR, deploys over SSH (`docker compose pull && up -d`).

## Consequences

- Low cost and few moving parts.
- Single host is a single point of failure for the app tier (data is safe in RDS/S3). Acceptable at launch.
- Scaling path without code changes: move containers to ECS Fargate behind an ALB, Redis to ElastiCache, add an RDS read replica.

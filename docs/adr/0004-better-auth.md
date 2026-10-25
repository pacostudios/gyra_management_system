# 0004 — Better Auth for authentication, custom authorization

**Status:** Accepted

## Context

The platform holds data about minors. Hand-written credential handling (hashing, sessions, reset tokens, 2FA) is the highest-risk code to get wrong and slow to build properly.

## Decision

- Better Auth, mounted in the Express API under `/api/auth`, handles: email/password login, sessions (stored in Postgres, httpOnly cookies), password reset, email verification, and TOTP 2FA for admin roles.
- Invitations are our own flow (single-use, expiring, hashed tokens) that creates the Better Auth user on acceptance.
- Authorization (roles + hierarchy scope) is our own code — see ADR 0006.

## Consequences

- Less custom security code to review.
- Session revocation is immediate (deactivate user → delete sessions).
- We depend on Better Auth's release cadence; pin versions and review upgrades.

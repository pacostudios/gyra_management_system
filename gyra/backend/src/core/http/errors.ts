import type { ErrorCode } from "@gyra/shared";
import type { ZodError } from "zod";

/** Base class for errors that map to an HTTP response. Anything else becomes a 500. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(details?: unknown, message = "Invalid request") {
    super(400, "VALIDATION_ERROR", message, details);
  }

  /** For request input only. Reports which fields failed, never the submitted values. */
  static fromZod(err: ZodError): ValidationError {
    return new ValidationError(err.issues.map((i) => ({ path: i.path, message: i.message })));
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHENTICATED", message);
  }
}

/** Use NotFoundError instead when admitting the resource exists would leak data across scopes. */
export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, "CONFLICT", message);
  }
}

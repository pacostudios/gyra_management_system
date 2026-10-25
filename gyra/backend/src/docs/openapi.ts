import { schemas } from "./components";
import { healthPaths } from "./paths/health.paths";

/**
 * The OpenAPI document. Each module documents its endpoints in paths/<module>.paths.ts,
 * reusing the Zod schemas from @gyra/shared, and is spread in here.
 */
export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "GYRA Management System API",
      version: "0.0.0",
      description: "Errors always use the shape `{ error: { code, message, details? } }`.",
    },
    servers: [{ url: "/" }],
    paths: {
      ...healthPaths,
    },
    components: { schemas },
  };
}

import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiDocument } from "./openapi";

/**
 * Swagger UI at /api/docs and the raw spec at /api/docs/openapi.json.
 * Mounted only when API_DOCS_ENABLED (default: off in production).
 */
export function docsRouter(): Router {
  const document = buildOpenApiDocument();
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.json(document);
  });
  router.use("/", swaggerUi.serve, swaggerUi.setup(document));

  return router;
}

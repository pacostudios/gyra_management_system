import { Router } from "express";

/** Mounted at /api/v1. Each module adds its router here, e.g. `router.use("/institutes", institutesRouter(deps))`. */
export function apiRouter(): Router {
  const router = Router();
  return router;
}

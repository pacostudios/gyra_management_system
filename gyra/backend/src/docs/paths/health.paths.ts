import { livenessSchema, readinessSchema } from "@gyra/shared";
import { jsonResponse, toSchema } from "../schema";

export const healthPaths = {
  "/healthz": {
    get: {
      tags: ["Health"],
      summary: "Liveness",
      description: "The process is running. Checks no dependencies.",
      responses: {
        200: jsonResponse("Alive", toSchema(livenessSchema)),
      },
    },
  },
  "/readyz": {
    get: {
      tags: ["Health"],
      summary: "Readiness",
      description: "Postgres and Redis are reachable. Failure reasons are logged, not returned.",
      responses: {
        200: jsonResponse("Ready", toSchema(readinessSchema)),
        503: jsonResponse("A dependency is unreachable", toSchema(readinessSchema)),
      },
    },
  },
};

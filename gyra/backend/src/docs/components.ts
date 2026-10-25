import { apiErrorSchema } from "@gyra/shared";
import { jsonResponse, ref, toSchema } from "./schema";

/** Schemas reused across many paths. Reference them with ref("Name"). */
export const schemas = {
  ApiError: toSchema(apiErrorSchema),
};

/** Standard error responses. Spread the ones an operation can return into its `responses`. */
export const errorResponses = {
  400: jsonResponse("Invalid request", ref("ApiError")),
  401: jsonResponse("Not signed in", ref("ApiError")),
  403: jsonResponse("Signed in but not allowed", ref("ApiError")),
  404: jsonResponse("Not found, or outside your scope", ref("ApiError")),
  500: jsonResponse("Unexpected server error", ref("ApiError")),
};

import { z } from "zod";

export type JsonSchema = Record<string, unknown>;

/** Converts a Zod schema (usually from @gyra/shared) to the JSON Schema OpenAPI 3.1 expects. */
export function toSchema(schema: z.ZodType): JsonSchema {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema, { io: "output" });
  return jsonSchema;
}

/** A JSON response for an operation's `responses` map. */
export function jsonResponse(description: string, schema: JsonSchema) {
  return { description, content: { "application/json": { schema } } };
}

/** Reference to a schema registered in components.schemas. */
export function ref(name: string): JsonSchema {
  return { $ref: `#/components/schemas/${name}` };
}

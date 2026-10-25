import { z } from "zod";

export const livenessSchema = z.object({ status: z.literal("ok") });

export const readinessSchema = z.object({
  status: z.enum(["ok", "error"]),
  checks: z.record(z.string(), z.enum(["ok", "error"])),
});

export type Liveness = z.infer<typeof livenessSchema>;
export type Readiness = z.infer<typeof readinessSchema>;

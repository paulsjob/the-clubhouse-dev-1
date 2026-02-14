
import { z } from 'zod';
import { GraphSchema } from './graph';

export const EngineValidateRequestV1Schema = z.object({
  graphId: z.string().optional(),
  graph: GraphSchema.optional(),
}).refine(data => data.graphId || data.graph, {
  message: "Either graphId or graph must be provided"
});

import { z } from 'zod';
import { GraphSnapshotV1Schema } from './graph'; // or wherever GraphSnapshotV1Schema is imported from in this repo

// If this file already imports GraphSnapshotV1Schema, do not duplicate, just keep one.

export const EngineValidateRequestV1Schema = z
  .object({
    graphId: z.string().optional(),
    graph: GraphSnapshotV1Schema.optional(),
  })
  .refine((v) => !!v.graphId || !!v.graph, {
    message: 'Either graphId or graph is required',
  });

export const EngineRunRequestV1Schema = z
  .object({
    graphId: z.string().optional(),
    graph: GraphSnapshotV1Schema.optional(),
    params: z.record(z.any()).optional(),
    trace: z.boolean().optional(),
  })
  .refine((v) => !!v.graphId || !!v.graph, {
    message: 'Either graphId or graph is required',
  });

export const EngineValidateResponseV1Schema = z.object({
  valid: z.boolean(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        nodeId: z.string().optional(),
      })
    )
    .default([]),
});

export const EngineRunResponseV1Schema = z.object({
  traceId: z.string(),
  finalOutput: z.any(),
  traceEvents: z
    .array(
      z.object({
        nodeId: z.string(),
        phase: z.string(),
        ts: z.number(),
        input: z.any().optional(),
        output: z.any().optional(),
        error: z.any().optional(),
      })
    )
    .optional(),
});

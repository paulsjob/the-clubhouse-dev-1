
import { z } from 'zod';

export const MLBTeamStateSchema = z.object({
  id: z.string(),
  abbr: z.string(),
  runs: z.number(),
  hits: z.number().optional(),
  errors: z.number().optional(),
});

export const MLBScorebugStateV1Schema = z.object({
  gameId: z.string(),
  status: z.enum(["pre", "live", "final", "delayed"]),
  home: MLBTeamStateSchema,
  away: MLBTeamStateSchema,
  inning: z.object({
    number: z.number(),
    half: z.enum(["top", "bottom"]),
  }),
  count: z.object({
    balls: z.number(),
    strikes: z.number(),
    outs: z.number(),
  }),
  bases: z.object({
    first: z.boolean(),
    second: z.boolean(),
    third: z.boolean(),
  }),
  lastEvent: z.object({
    type: z.string(),
    summary: z.string(),
    ts: z.number(),
  }).optional(),
  ts: z.number(),
});

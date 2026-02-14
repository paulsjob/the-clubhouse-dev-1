
import { z } from 'zod';

export const PublishRequestV1Schema = z.object({
  topic: z.string(),
  payload: z.any(),
});

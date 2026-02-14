
import { z } from 'zod';

export const DeployRequestV1Schema = z.object({
  outputId: z.string(),
  route: z.string(),
});

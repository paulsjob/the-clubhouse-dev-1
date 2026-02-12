import { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config';
import { wrapError } from '../utils/responses';

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (request) => {
      return request.rl?.orgId || request.ip;
    },
    errorResponseBuilder: (request, context) => {
      return wrapError('TOO_MANY_REQUESTS', `Rate limit exceeded. Try again in ${context.after}`, request.id);
    }
  });
};

export default rateLimitPlugin;
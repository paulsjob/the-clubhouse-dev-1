
import { FastifyPluginAsync } from 'fastify';
import { pubSubService } from '../../../services/live/pubsub';
import { ephemeralStateStore } from '../../../services/storage';

export const streamRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/live/stream/:topic', async (request, reply) => {
    const { topic } = request.params as { topic: string };
    const orgId = request.rl.orgId;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    // Send last known value immediately if it exists
    const lastValue = ephemeralStateStore.get(`${orgId}:${topic}`);
    if (lastValue) {
      const payload = JSON.stringify({
        ts: Date.now(),
        topic,
        seq: 0,
        data: lastValue,
        isInitial: true
      });
      reply.raw.write(`event: message\ndata: ${payload}\n\n`);
    }

    pubSubService.addConnection(orgId, topic, reply);

    // Keep the request open
    await new Promise(() => {});
  });
};

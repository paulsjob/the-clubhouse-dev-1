
import { FastifyPluginAsync } from 'fastify';
import { pubSubService } from '../../services/live/pubsub';
import { ephemeralStateStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';

export const busRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /v1/bus/topics
   * List all topics that have ever been published or have subscribers in the org.
   */
  fastify.get('/v1/bus/topics', {
    schema: {
      tags: ['Live Bus'],
      summary: 'List active topics',
      description: 'Returns metadata for all data streams currently known to the Live Bus.',
    } as any
  }, async (request) => {
    const orgId = request.rl.orgId;
    const prefix = `${orgId}:`;
    
    // Extract topics from the ephemeral state store
    const topics = Array.from(ephemeralStateStore.keys())
      .filter(k => k.startsWith(prefix))
      .map(k => k.replace(prefix, ''));

    const result = topics.map(topic => ({
      topic,
      isPaused: pubSubService.isPaused(orgId, topic),
      subscribers: pubSubService.getSubscriberCount(orgId, topic),
      hasLastValue: true
    }));

    return wrapSuccess(result, request.id);
  });

  /**
   * GET /v1/bus/topics/:topic
   * Inspect a specific topic
   */
  fastify.get('/v1/bus/topics/:topic', {
    schema: {
      tags: ['Live Bus'],
      summary: 'Inspect topic',
      params: { type: 'object', properties: { topic: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { topic } = request.params as { topic: string };
    const orgId = request.rl.orgId;
    const lastValue = ephemeralStateStore.get(`${orgId}:${topic}`);

    if (lastValue === undefined) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'Topic has no data in current session', request.id));
    }

    return wrapSuccess({
      topic,
      isPaused: pubSubService.isPaused(orgId, topic),
      subscribers: pubSubService.getSubscriberCount(orgId, topic),
      lastValue
    }, request.id);
  });

  /**
   * POST /v1/bus/topics/:topic/pause
   */
  fastify.post('/v1/bus/topics/:topic/pause', {
    schema: {
      tags: ['Live Bus'],
      summary: 'Pause topic broadcast',
      params: { type: 'object', properties: { topic: { type: 'string' } } }
    } as any
  }, async (request) => {
    const { topic } = request.params as { topic: string };
    pubSubService.pause(request.rl.orgId, topic);
    return wrapSuccess({ topic, status: 'paused' }, request.id);
  });

  /**
   * POST /v1/bus/topics/:topic/resume
   */
  fastify.post('/v1/bus/topics/:topic/resume', {
    schema: {
      tags: ['Live Bus'],
      summary: 'Resume topic broadcast',
      params: { type: 'object', properties: { topic: { type: 'string' } } }
    } as any
  }, async (request) => {
    const { topic } = request.params as { topic: string };
    pubSubService.resume(request.rl.orgId, topic);
    return wrapSuccess({ topic, status: 'active' }, request.id);
  });
};

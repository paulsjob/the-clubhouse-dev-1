
import { FastifyPluginAsync } from 'fastify';
import { pubSubService } from '../../services/live/pubsub';
import { busStore, ephemeralStateStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { PublishRequestV1Schema, BusEventV1 } from '@renderless/contracts';

export const busRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /v1/bus/stream/:topic (SSE)
   */
  fastify.get('/v1/bus/stream/:topic', {
    schema: {
      tags: ['Live Bus'],
      summary: 'Live SSE stream with replay',
      params: { type: 'object', properties: { topic: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { topic } = request.params as { topic: string };
    const orgId = request.rl.orgId;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    // Replay last 25 events
    const history = await busStore.list(orgId, topic === '*' ? undefined : topic);
    const replay = history.slice(-25);
    
    if (replay.length > 0) {
      reply.raw.write(`event: replay\ndata: ${JSON.stringify(replay)}\n\n`);
    }

    // Subscribe to new events
    pubSubService.addConnection(orgId, topic, reply);

    // Keep connection alive
    request.raw.on('close', () => {
      // Cleanup handled in pubSubService
    });

    await new Promise(() => {});
  });

  /**
   * POST /v1/bus/publish
   */
  fastify.post('/v1/bus/publish', {
    schema: {
      tags: ['Live Bus'],
      summary: 'Publish event to bus',
      body: { type: 'object', required: ['topic', 'payload'] }
    } as any
  }, async (request) => {
    const body = PublishRequestV1Schema.parse(request.body);
    const orgId = request.rl.orgId;

    const event: BusEventV1 = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      topic: body.topic,
      orgId,
      ts: Date.now(),
      payload: body.payload
    };

    await busStore.create(orgId, event);
    ephemeralStateStore.set(`${orgId}:${body.topic}`, body.payload);
    pubSubService.publish(orgId, body.topic, body.payload);

    return wrapSuccess({ published: true, id: event.id }, request.id);
  });

  fastify.get('/v1/bus/topics', {
    schema: {
      tags: ['Live Bus'],
      summary: 'List active topics',
    } as any
  }, async (request) => {
    const orgId = request.rl.orgId;
    const prefix = `${orgId}:`;
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
};

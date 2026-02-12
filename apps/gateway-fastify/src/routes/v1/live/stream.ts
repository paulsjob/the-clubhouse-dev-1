
import { FastifyPluginAsync } from 'fastify';
import { pubSubService } from '../../../services/live/pubsub';
import { ephemeralStateStore, schemaStore, latestTopicSchemaMap } from '../../../services/storage';
import { SchemaDeriver } from '../../../services/schema/derivation';
import { wrapSuccess, wrapError } from '../../../utils/responses';
import { SchemaSnapshotV1 } from '@renderless/contracts';

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

  // ITEM 08: Topic Schema Discovery
  fastify.get('/v1/live/topics/:topic/schema', async (request, reply) => {
    const { topic } = request.params as { topic: string };
    const orgId = request.rl.orgId;

    const lastValue = ephemeralStateStore.get(`${orgId}:${topic}`);
    if (!lastValue) {
      return reply.code(404).send(wrapError('NOT_FOUND', 'No live data received yet for this topic. Start a session first.', request.id));
    }

    try {
      const fields = SchemaDeriver.derive(lastValue);
      const hash = SchemaDeriver.generateHash(fields);

      const snapshot: SchemaSnapshotV1 = {
        id: `schema_${Date.now()}`,
        orgId: orgId,
        createdAt: Date.now(),
        sourceType: "live_topic",
        sourceId: topic,
        fields,
        hash
      };

      await schemaStore.create(orgId, snapshot);
      latestTopicSchemaMap.set(topic, snapshot.id);

      return wrapSuccess(snapshot, request.id);
    } catch (e: any) {
      return reply.code(500).send(wrapError('SCHEMA_DERIVATION_ERROR', e.message, request.id));
    }
  });
};

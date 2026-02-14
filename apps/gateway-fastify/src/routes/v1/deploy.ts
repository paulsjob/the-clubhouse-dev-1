
import { FastifyPluginAsync } from 'fastify';
import { deployStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { DeployRequestV1Schema, DeployResponseV1 } from '@renderless/contracts';

export const deployRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /v1/deploy
   * Registers an output deployment record.
   */
  fastify.post('/v1/deploy', {
    schema: {
      tags: ['Deployment'],
      summary: 'Register output deployment stub',
      body: { type: 'object', required: ['outputId', 'route'] }
    } as any
  }, async (request) => {
    const body = DeployRequestV1Schema.parse(request.body);
    const orgId = request.rl.orgId;
    const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const record = {
      id: deploymentId,
      deploymentId,
      outputId: body.outputId,
      route: body.route,
      status: 'registered' as const,
      createdAt: Date.now(),
      orgId
    };

    await deployStore.create(orgId, record);

    return wrapSuccess(record, request.id);
  });

  fastify.get('/v1/deploy', {
    schema: {
      tags: ['Deployment'],
      summary: 'List deployment records',
    } as any
  }, async (request) => {
    const items = await deployStore.list(request.rl.orgId);
    return wrapSuccess(items, request.id);
  });
};

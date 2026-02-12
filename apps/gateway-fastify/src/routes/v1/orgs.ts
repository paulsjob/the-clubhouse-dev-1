
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { orgStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { config } from '../../config';
import { OrganizationCreateSchema, OrganizationUpdateSchema } from '@renderless/contracts';

/**
 * ITEM 12: Admin authentication preHandler
 */
const adminAuthPreHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const adminKey = request.headers['x-rl-admin-key'];
  if (!adminKey || adminKey !== config.adminApiKey) {
    return reply.code(401).send(wrapError('UNAUTHORIZED', 'Missing or invalid admin key', request.id));
  }
};

export const orgRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply admin auth to all routes in this plugin
  fastify.addHook('preHandler', adminAuthPreHandler);

  fastify.get('/v1/orgs', {
    schema: {
      tags: ['Organizations'],
      summary: 'List all organizations',
      description: 'Administrative endpoint to list all tenants in the system.',
      security: [{ apiKeyHeader: [] }]
    } as any
  }, async (request) => {
    const items = await orgStore.getAllGlobal();
    return wrapSuccess(items, request.id);
  });

  fastify.get('/v1/orgs/:id', {
    schema: {
      tags: ['Organizations'],
      summary: 'Get organization details',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      security: [{ apiKeyHeader: [] }]
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await orgStore.getById(id);
    if (!item) return reply.code(404).send(wrapError('NOT_FOUND', 'Organization not found', request.id));
    return wrapSuccess(item, request.id);
  });

  fastify.post('/v1/orgs', {
    schema: {
      tags: ['Organizations'],
      summary: 'Create new organization',
      body: { 
        type: 'object', 
        required: ['id', 'name', 'apiKey'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          apiKey: { type: 'string' },
          isActive: { type: 'boolean', default: true },
          metadata: { type: 'object' }
        }
      },
      security: [{ apiKeyHeader: [] }]
    } as any
  }, async (request, reply) => {
    const body = request.body as any;
    
    try {
      const validated = OrganizationCreateSchema.parse(body);
      
      const existing = await orgStore.getById(validated.id);
      if (existing) {
        return reply.code(409).send(wrapError('CONFLICT', 'Organization ID already exists', request.id));
      }

      const newOrg = {
        ...validated,
        orgId: validated.id, // satisfy InMemoryStore constraint
        createdAt: Date.now(),
        isActive: validated.isActive ?? true,
      };

      const created = await orgStore.create(validated.id, newOrg);
      return wrapSuccess(created, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('VALIDATION_ERROR', e.message, request.id));
    }
  });

  fastify.patch('/v1/orgs/:id', {
    schema: {
      tags: ['Organizations'],
      summary: 'Update organization',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object' },
      security: [{ apiKeyHeader: [] }]
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    try {
      const validated = OrganizationUpdateSchema.parse(body);
      const updated = await orgStore.update(id, id, validated);
      if (!updated) return reply.code(404).send(wrapError('NOT_FOUND', 'Organization not found', request.id));
      return wrapSuccess(updated, request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('VALIDATION_ERROR', e.message, request.id));
    }
  });

  fastify.delete('/v1/orgs/:id', {
    schema: {
      tags: ['Organizations'],
      summary: 'Delete organization',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      security: [{ apiKeyHeader: [] }]
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await orgStore.delete(id, id);
    if (!success) return reply.code(404).send(wrapError('NOT_FOUND', 'Organization not found', request.id));
    return wrapSuccess({ deleted: true }, request.id);
  });
};


import { FastifyPluginAsync } from 'fastify';
import { credentialStore } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { CredentialSchema } from '@renderless/contracts';

const redactCredential = (cred: any) => {
  const { secrets, ...rest } = cred;
  return {
    ...rest,
    hasSecret: !!secrets && Object.keys(secrets).length > 0
  };
};

export const credentialRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/v1/credentials', {
    schema: {
      tags: ['Credentials'],
      summary: 'List credentials',
      description: 'Returns all credentials for the current organization (secrets redacted).',
    } as any
  }, async (request) => {
    const items = await credentialStore.list(request.rl.orgId);
    return wrapSuccess(items.map(redactCredential), request.id);
  });

  fastify.get('/v1/credentials/:id', {
    schema: {
      tags: ['Credentials'],
      summary: 'Get credential',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await credentialStore.get(request.rl.orgId, id);
    if (!item) return reply.code(404).send(wrapError('NOT_FOUND', 'Credential not found', request.id));
    return wrapSuccess(redactCredential(item), request.id);
  });

  fastify.post('/v1/credentials', {
    schema: {
      tags: ['Credentials'],
      summary: 'Create credential',
      body: { type: 'object', required: ['name', 'provider', 'type', 'secrets'] }
    } as any
  }, async (request, reply) => {
    const body = request.body as any;
    const id = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newCred = {
      ...body,
      id,
      orgId: request.rl.orgId,
      createdAt: Date.now(),
      isActive: true,
    };

    try {
      CredentialSchema.parse(newCred);
      const created = await credentialStore.create(request.rl.orgId, newCred);
      return wrapSuccess(redactCredential(created), request.id);
    } catch (e: any) {
      return reply.code(400).send(wrapError('VALIDATION_ERROR', e.message, request.id));
    }
  });

  fastify.put('/v1/credentials/:id', {
    schema: {
      tags: ['Credentials'],
      summary: 'Update credential',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const updated = await credentialStore.update(request.rl.orgId, id, body);
    if (!updated) return reply.code(404).send(wrapError('NOT_FOUND', 'Credential not found', request.id));
    return wrapSuccess(redactCredential(updated), request.id);
  });

  fastify.delete('/v1/credentials/:id', {
    schema: {
      tags: ['Credentials'],
      summary: 'Delete credential',
      params: { type: 'object', properties: { id: { type: 'string' } } }
    } as any
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await credentialStore.delete(request.rl.orgId, id);
    if (!success) return reply.code(404).send(wrapError('NOT_FOUND', 'Credential not found', request.id));
    return wrapSuccess({ deleted: true }, request.id);
  });
};

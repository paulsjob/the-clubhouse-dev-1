
import { FastifyPluginAsync } from 'fastify';
import { exportOrgSnapshot, importOrgSnapshot } from '../../services/storage';
import { wrapSuccess, wrapError } from '../../utils/responses';
import { SnapshotImportV1Schema, CONTRACTS_VERSION } from '@renderless/contracts';
import { config } from '../../config';

export const snapshotRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/v1/snapshot/export',
    {
      schema: {
        tags: ['Snapshot'],
        summary: 'Export organization snapshot',
        description: 'Returns a complete backup of organization resources.',
        querystring: {
          type: 'object',
          properties: { includeSecrets: { type: 'boolean', default: false } },
        },
      } as any,
    },
    async (request, reply) => {
      const q = request.query as any;
      const includeSecrets =
        q?.includeSecrets === true || q?.includeSecrets === 'true';

      const orgId = request.rl.orgId;

      if (includeSecrets && config.nodeEnv === 'production') {
        return reply
          .code(403)
          .send(
            wrapError(
              'FORBIDDEN',
              'Exporting secrets is prohibited in production environment',
              request.id
            )
          );
      }

      try {
        const snapshot = await exportOrgSnapshot(orgId, includeSecrets);

        if (includeSecrets) {
          fastify.log.warn(
            { orgId, requestId: request.id },
            'Org snapshot exported WITH secrets'
          );
        }

        return wrapSuccess(
          {
            version: CONTRACTS_VERSION,
            generatedAt: Date.now(),
            orgId,
            snapshot,
          },
          request.id
        );
      } catch (e: any) {
        return reply.code(500).send(wrapError('EXPORT_FAILED', e.message, request.id));
      }
    }
  );
};


  fastify.post('/v1/snapshot/import', {
    schema: {
      tags: ['Snapshot'],
      summary: 'Import organization snapshot',
      description: 'Restore organization resources from a previous export.',
      body: {
        type: 'object',
        required: ['mode', 'snapshot'],
        properties: {
          mode: { type: 'string', enum: ['merge', 'replace'] },
          snapshot: { type: 'object' }
        }
      }
    } as any
  }, async (request, reply) => {
    const orgId = request.rl.orgId;
    const body = request.body as any;

    try {
      const { snapshot, mode } = SnapshotImportV1Schema.parse(body);

      // Security check for secrets in production
      const hasSecrets = snapshot.credentials.some(c => c.secrets && Object.keys(c.secrets).length > 0);
      if (hasSecrets && config.nodeEnv === 'production') {
        return reply.code(403).send(wrapError('FORBIDDEN', 'Importing credentials with secrets is prohibited in production via snapshot', request.id));
      }

      await importOrgSnapshot(orgId, snapshot, mode);

      fastify.log.info({ orgId, mode, requestId: request.id }, 'Org snapshot imported');
      
      return wrapSuccess({ 
        ok: true,
        mode,
        counts: {
          credentials: snapshot.credentials.length,
          resources: snapshot.resources.length,
          graphs: snapshot.graphs.length,
          outputs: snapshot.outputs.length,
          liveSessions: snapshot.liveSessions.length,
          schemas: snapshot.schemas.length,
        }
      }, request.id);
    } catch (e: any) {
      const code = e.name === 'ZodError' ? 'VALIDATION_ERROR' : 'IMPORT_FAILED';
      return reply.code(400).send(wrapError(code, e.message, request.id));
    }
  });
};

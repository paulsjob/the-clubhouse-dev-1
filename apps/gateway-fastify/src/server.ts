
import Fastify, { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import corsPlugin from './plugins/cors';
import authPlugin from './plugins/auth';
import rateLimitPlugin from './plugins/rateLimit';
import { healthRoutes } from './routes/health';
import { whoamiRoutes } from './routes/whoami';
import { credentialRoutes } from './routes/v1/credentials';
import { resourceRoutes } from './routes/v1/resources';
import { fetchRoutes } from './routes/v1/fetch';
import { liveSessionRoutes } from './routes/v1/live/sessions';
import { streamRoutes } from './routes/v1/live/stream';
import { graphRoutes } from './routes/v1/graphs';
import { outputRoutes } from './routes/v1/outputs';
import { snapshotRoutes } from './routes/v1/snapshot';
import { orgRoutes } from './routes/v1/orgs';
import pkg from '../package.json';

export const buildServer = (): FastifyInstance => {
  const server = Fastify({
    logger: config.nodeEnv === 'development' ? {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    } : true,
    requestIdHeader: 'x-request-id',
  });

  // ITEM 11: Swagger Registration
  server.register(swagger, {
    openapi: {
      info: {
        title: 'Renderless Gateway',
        description: 'Multi-tenant live data compositor gateway',
        version: pkg.version
      },
      servers: [
        { url: `http://localhost:${config.port}`, description: 'Local Development' }
      ],
      components: {
        securitySchemes: {
          orgIdHeader: {
            type: 'apiKey',
            name: 'x-rl-org-id',
            in: 'header',
            description: 'The Organization ID'
          },
          apiKeyHeader: {
            type: 'apiKey',
            name: 'x-rl-api-key',
            in: 'header',
            description: 'The API Key for the Organization'
          },
          adminKeyHeader: {
            type: 'apiKey',
            name: 'x-rl-admin-key',
            in: 'header',
            description: 'The Administrative API Key'
          }
        }
      },
      security: [
        { orgIdHeader: [], apiKeyHeader: [] }
      ]
    }
  });

  if (config.docsEnabled) {
    server.register(swaggerUi, {
      routePrefix: config.docsRoutePrefix,
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      },
      staticCSP: true,
      transformStaticCSP: (header) => header
    });
  }

  // Register Plugins
  server.register(corsPlugin);
  server.register(authPlugin);
  server.register(rateLimitPlugin);

  // Register Routes
  server.register(healthRoutes);
  server.register(whoamiRoutes);
  server.register(credentialRoutes);
  server.register(resourceRoutes);
  server.register(fetchRoutes);
  server.register(liveSessionRoutes);
  server.register(streamRoutes);
  server.register(graphRoutes);
  server.register(outputRoutes);
  server.register(snapshotRoutes);
  server.register(orgRoutes);

  return server;
};

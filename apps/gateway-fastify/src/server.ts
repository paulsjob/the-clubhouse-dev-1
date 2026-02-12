
import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config';
import corsPlugin from './plugins/cors';
import authPlugin from './plugins/auth';
import rateLimitPlugin from './plugins/rateLimit';
import { healthRoutes } from './routes/health';
import { whoamiRoutes } from './routes/whoami';
import { credentialRoutes } from './routes/v1/credentials';
import { resourceRoutes } from './routes/v1/resources';
import { fetchRoutes } from './routes/v1/fetch';

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
    // Use Fastify's built-in request ID generator
    requestIdHeader: 'x-request-id',
  });

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

  return server;
};

import Fastify, { FastifyInstance } from 'fastify';
import process from 'node:process';
import { config } from './config';
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
    } : true
  });

  server.get('/health', async () => {
    return {
      ok: true,
      service: "gateway",
      version: pkg.version,
      uptimeSec: Math.floor(process.uptime()),
      ts: Date.now()
    };
  });

  return server;
};
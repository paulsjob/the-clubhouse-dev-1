import { FastifyPluginAsync } from 'fastify';
import process from 'node:process';
import pkg from '../../package.json';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return {
      ok: true,
      service: "gateway",
      version: pkg.version,
      uptimeSec: Math.floor(process.uptime()),
      ts: Date.now()
    };
  });
};
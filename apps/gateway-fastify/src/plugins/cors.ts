import { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../config';

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: config.nodeEnv === 'production' ? config.corsOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-rl-org-id', 'x-rl-api-key'],
  });
};

export default corsPlugin;
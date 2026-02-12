

import Fastify from 'fastify';
// Fix: Explicitly import process from node:process to provide correct TypeScript definitions for process.exit
import process from 'node:process';

const fastify = Fastify({
  logger: true
});

fastify.get('/health', async (request, reply) => {
  return { ok: true };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
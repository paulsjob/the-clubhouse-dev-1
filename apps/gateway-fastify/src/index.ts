import process from 'node:process';
import { buildServer } from './server';
import { config } from './config';

const server = buildServer();

const start = async () => {
  try {
    const address = await server.listen({ 
      port: config.port, 
      host: '0.0.0.0' 
    });
    server.log.info(`Gateway logic skeleton active at ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
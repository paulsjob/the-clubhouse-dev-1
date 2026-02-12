
import process from 'node:process';
import { buildServer } from './server';
import { config } from './config';
import { PersistenceManager } from './services/storage';

const server = buildServer();

const start = async () => {
  try {
    // ITEM 10: Initialize persistence before accepting traffic
    await PersistenceManager.init();

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

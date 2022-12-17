import { config } from '../config/config';
import * as Redis from 'redis';
import logger from './logger';

const redis = Redis.createClient({
  socket: {
    host: config.REDIS_HOST,
    port: Number(config.REDIS_PORT),
    keepAlive: false,
  },
  password: config.REDIS_PASS,
});

redis.connect();

redis.on('error', (err) => {
  logger.error(`Failed to connect Redis server Error: ${err}`);
  redis.disconnect();
  // eslint-disable-next-line no-undef
  setTimeout(() => {
    logger.warn('reconnecting to redis');
    redis.connect();
  }, 5000);
});

redis.on('ready', () => {
  logger.warn('redis connected');
});

export { redis };

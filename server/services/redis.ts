import { createClient } from 'redis';
import logger from './logger';

const client = createClient({
    socket: {
        host: process.env.REDIS_HOST!,
        port: parseInt(process.env.REDIS_PORT!||"6379", 10)
    }
});

client.on('error', err => logger.error(err));

const setRedisKey = async (key: string, data: Record<string, unknown>) => {
    await client.set(key, JSON.stringify(data), { EX: 60*60*24 }); // 24 hours
}

const redisDeleteAll = async (pattern: string) => {
    const keys = await client.keys(pattern);
    for(const key of keys) {
        await client.del(key);
    }
}

export default client;
export { setRedisKey, redisDeleteAll }
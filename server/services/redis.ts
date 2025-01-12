import { createClient } from 'redis';

const client = createClient({
    socket: {
        host: process.env.REDIS_HOST!,
        port: parseInt(process.env.REDIS_PORT!||"6379", 10)
    }
});

client.on('error', (err) => 
    console.log('Redis Client Error', err)
);

const setRedisKey = async (key: string, data: Record<string, unknown>) => {
    await client.set(key, JSON.stringify(data));
    await client.expireAt(key, (Date.now()/1000) * 86400); // expires in 24 hours
}

export default client;
export { setRedisKey }
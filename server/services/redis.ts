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

export default client;
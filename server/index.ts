import Fastify from "fastify";

import fastifyRateLimit from "@fastify/rate-limit";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from '@fastify/cors';
import fastifyMultipart from "@fastify/multipart";
import fastifyWebsocket from "@fastify/websocket";

import redis from "./services/redis";
import websocket from "./services/websocket";

// custom hooks
import dataSourcesMiddleware from "./middlewares/dataSourcesMiddleware";

const fastify = Fastify({ logger: true });

const PORT = 8080;

// helmet
await fastify.register(fastifyHelmet, { 
    contentSecurityPolicy: false, 
    crossOriginResourcePolicy: false 
})

// cors
await fastify.register(fastifyCors);

// rate limit
await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute'
})

// for files
await fastify.register(fastifyMultipart);

// websocket
await fastify.register(fastifyWebsocket);

// middlewares
fastify.addHook("preHandler", dataSourcesMiddleware);
fastify.addHook("preHandler", tokenMiddleware);

// routes
import router from "./routes/index";
import tokenMiddleware from "./middlewares/tokenMiddleware";
router(fastify);

try {    
    await redis.connect();
    console.log(`Connected to redis ! ✅`);

    websocket(fastify);
    console.log(`Websocket enabled on /ws/`)

    // listening to 0.0.0.0 (for container)
    await fastify.listen({ host: "0.0.0.0", port: PORT });
    console.log(`Server running on port http://localhost:${PORT} 🚀`);
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
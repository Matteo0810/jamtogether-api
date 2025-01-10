import { WebSocket } from "@fastify/websocket";
import { FastifyInstance, FastifyRequest } from "fastify";

const webSocketConnections: {[key: string]: WebSocket} = {};

const fastifyWs = (fastify: FastifyInstance) => {
    fastify.get('/ws/:id', { websocket: true }, (connection: WebSocket, request: FastifyRequest) => {
        const params = request.params as {userId: string};
        
        if(!params?.userId) {
            console.error(`No user id found`)
            return;
        }
        
        const userId = params.userId;
        console.log(`[Websocket] new socket connection: ` + userId);
        webSocketConnections[userId] = connection;
    
        connection.on('close', () => {
            delete webSocketConnections[userId];
            console.log(`[Websocket] socket connection closed: ` + userId);
        })
    });
}

export default fastifyWs;
export { webSocketConnections };

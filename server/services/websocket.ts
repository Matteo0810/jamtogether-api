import { WebSocket } from "@fastify/websocket";
import { FastifyInstance, FastifyRequest } from "fastify";

const webSocketConnections: {[key: string]: WebSocket} = {};

const fastifyWs = (fastify: FastifyInstance) => {
    fastify.get('/ws/:id', { websocket: true }, (connection: WebSocket, request: FastifyRequest) => {
        const userId = request.url.split("/").pop();
        
        if(!userId) {
            console.error(`No user id found`)
            return;
        }
        
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

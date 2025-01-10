import { FastifyInstance } from "fastify";

const webSocketConnections: {[key: string]: WebSocket} = {};

const fastifyWs = (fastify: FastifyInstance) => {
    fastify.get('/ws', { websocket: true }, (connection: any, request: any) => {
        const userId = request.url.split("/").pop();
        if(!userId) {
            console.error(`No user id found, found: ${userId}`)
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

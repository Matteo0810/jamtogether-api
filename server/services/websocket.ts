import { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const webSocketConnections: {[key: string]: WebSocket} = {};

wss.on("connection", (ws: WebSocket, request: Request) => {
    const userId = request.url.split("/").pop();
    if(!userId)
        return;
    console.log(`[Websocket] new socket connection: ` + userId);
    webSocketConnections[userId] = ws;

    wss.on('close', () => {
        delete webSocketConnections[userId];
        console.log(`[Websocket] socket connection closed: ` + userId);
    })
});

export default server;
export { webSocketConnections };
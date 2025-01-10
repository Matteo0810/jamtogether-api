import { WebSocketServer } from "ws";
import http from "http";

const certPath = '/certs/ballon2zipette.com/fullchain.pem';
const keyPath = '/certs/ballon2zipette.com/privkey.pem';

const useSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

if(useSSL) {
    server = http.createServer({
     cert: certPath,
     key: keyPath
    });
} else {
    console.warn('No certificate found ! Use no ssl certificate there.')
    server = http.createServer();
}
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

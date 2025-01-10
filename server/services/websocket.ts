import { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import https from "https";
import fs from "fs";

const certPath = '/certs/ballon2zipette.com/fullchain.pem';
const keyPath = '/certs/ballon2zipette.com/privkey.pem';

const app = express();
const useSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

let server: https.Server|http.Server;
if(useSSL) {
    server = https.createServer({
     cert: fs.readFileSync(certPath),
     key: fs.readFileSync(keyPath)
    }, app);
} else {
    console.warn('No certificate found ! Use no ssl certificate there.')
    server = http.createServer(app);
}
const wss = new WebSocketServer({ server });

const webSocketConnections: {[key: string]: WebSocket} = {};

app.get('/', (_, res) => {
    res.send('Health checked !');
});

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

    wss.on('error', (error: Error) => {
        console.error(`[Websocket] error for ${userId}:`, error);
        ws.close();
    });
});

export default server;
export { webSocketConnections };

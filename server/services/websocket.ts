import { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import https from "https";
import fs from "fs";

const certPath = '/certs/ballon2zipette.com/fullchain.pem';
const keyPath = '/certs/ballon2zipette.com/privkey.pem';

const app = express();
const useSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

app.get('/', (req, res) => {
    console.log("Received HTTP request at /");
    res.send('Hello from Express!');
});

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

wss.on("connection", (ws: WebSocket, request: Request) => {
    const userId = request.url.split("/").pop();
    if(!userId) {
        console.error(`No user id found, found: ${userId}`)
        return;
    }
    console.log(`[Websocket] new socket connection: ` + userId);
    webSocketConnections[userId] = ws;

    wss.on('close', () => {
        delete webSocketConnections[userId];
        console.log(`[Websocket] socket connection closed: ` + userId);
    })
});

export default server;
export { webSocketConnections };

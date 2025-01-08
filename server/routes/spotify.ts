import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import queryString from "query-string";
import {v4 as uuid} from "uuid";

// TODO: deplacer tous les endpoints dans un datasource spotify pour clean un peu
export default (fastify: FastifyInstance) => {

    fastify.get("/login", {
        handler: (request: FastifyRequest, reply: FastifyReply) => {
            const client_id = process.env.SPOTIFY_CLIENT_ID!;
            const redirect_uri = process.env.WEBSITE_URL+"/create-room";

            const state = uuid();
            const scope = [
                'app-remote-control', 
                'user-read-currently-playing', 
                'user-read-playback-position', 
                'user-read-private',
                'user-modify-playback-state',
                'user-read-playback-state'
            ];
          
            const url = 'https://accounts.spotify.com/authorize?' +
                queryString.stringify({
                    response_type: 'code',
                    client_id,
                    scope: scope.join(" "),
                    redirect_uri,
                    state
                });

            reply.status(200).send({ url });
        }
    });

    fastify.post("/access-token", {
        schema: {
            body: {
                type: "object",
                required: ["code"],
                properties: {
                    code: { type: "string", minLength: 1 }
                },
                additionalProperties: false
            }
        },
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            const { code } = request.body as { code: string };
            const client_id = process.env.SPOTIFY_CLIENT_ID!;
            const client_secret = process.env.SPOTIFY_CLIENT_SECRET!;
        
            const params = queryString.stringify({
                code,
                redirect_uri: process.env.WEBSITE_URL+"/create-room",
                grant_type: "authorization_code"
            })

            try {
                const response = await fetch("https://accounts.spotify.com/api/token?"+params, {
                    method: "POST",
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
                    }
                });
                const data = await response.json();
                if(!response.ok) {
                    throw new Error(data?.error_description ?? data?.error ?? "HTTP Error ! " + response.status);
                }
                
                const currentDate = Date.now();
                data.expires_at = currentDate + data.expires_in * 1000;

                reply.send(data);
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({
                    message: error.message,
                    name: error.name
                });
            }
        }
    });

}
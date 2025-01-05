import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IMusicToken } from "../business/musicServices/MusicService";

const idParamsCheck = {
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string", minLength: 1 }
        },
        additionalProperties: false
    }
}

export default (fastify: FastifyInstance) => {

    fastify.post("/create", {
        schema: {
            body: {
                type: "object",
                required: ["token"],
                properties: {
                    token: {
                        type: "object",
                        required: ["type", "authorization"],
                        properties: {
                            type: { type: "string", minLength: 1 },
                            authorization: { type: "string", minLength: 1 }
                        },
                        additionalProperties: false
                    }
                },
                additionalProperties: false
            }
        },
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { token } = request.body as {token: IMusicToken};
                const room = await request.dataSources.rooms.create(token);

                reply.status(200).send({
                    redirectURI: `${process.env.WEBSITE_URL!}/room/${room.id}`,
                    clientId: room.ownerId,
                    room
                });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message });
            }
        }
    });

    fastify.post("/refresh-authorization", {
        schema: {
            body: {
                type: "object",
                required: ["roomId", "newAuthorization"],
                properties: {
                    newAuthorization: { type: "string", minLength: 1 },
                    roomId: { type: "string", minLength: 1 }
                },
                additionalProperties: false
            },
            headers: {
                type: "object",
                required: ["x-room-owner-id"],
                properties: {
                    "x-room-owner-id": { type: "string", minLength: 1 }
                },
                additionalProperties: false
            }
        },
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            const headers = req.headers as { "x-room-owner-id": string; };
            const { roomId, newAuthorization } = req.body as { roomId: string; newAuthorization: string; };
            
            const room = await req.dataSources.rooms.get(roomId);
            if(room === null) {
                reply.status(404).send({ message: "room not found with id: " + roomId });
            }
            
            if(room?.ownerId !== headers["x-room-owner-id"]) {
                reply.status(403).send({ message: "You are not the room owner." });
            }
            req.dataSources.rooms.update(room?.id!, {
                token: {
                    ...room?.token!,
                    authorization: newAuthorization
                }
            });
            reply.status(200).send({ message: "Room token updated" });
        }
    })

    fastify.post("/join/:id", {
        schema: {
            ...idParamsCheck
        },
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const {id} = request.params as {id: string};
                const clientId = request.dataSources.rooms.generateClientId();
                const r = await request.dataSources.rooms.get(id);

                if(!r) {
                    throw new Error("Chambre introuvable.");
                }
                const {token, service, ...room}:any= r;
                await request.dataSources.rooms.join(room, clientId);
                reply.status(200).send({ clientId, room })
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message });
            }
        }
    })

    fastify.get("/get/:id", {
        schema: idParamsCheck,
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as {id: string;}; 
                const room = await request.dataSources.rooms.get(id);
                if(!room) {
                    reply.status(404).send({ message: "Room introuvable." });
                }

                const player = await room?.service.getPlayer();
                const { currentPlaying, queue } = await room?.service.getQueue()!;
                const {token, service, ...r}: any = room;

                reply.status(200).send({ 
                    room: { 
                        ...r, 
                        queue, 
                        currentPlaying, 
                        isPlaying: player ? player.isPlaying : false
                    } 
                });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

}
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IMusicToken, ITrack } from "../business/musicServices/MusicService";
import { RoomEvents } from "../dataSources/rooms";

const idParamsCheck = {
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string", minLength: 1 }
        },
        additionalProperties: false
    }
};

export default (fastify: FastifyInstance) => {
    // TODO: reduce code size, add more security (pass token with room-client-identities)

    fastify.post("/rooms/create", {
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

    fastify.post("/rooms/refresh-authorization", {
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

    fastify.post("/rooms/join/:id", {
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

    fastify.get("/rooms/get/:id", {
        schema: {
            ...idParamsCheck
        },
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const { id } = request.params as {id: string;}; 
                const room = await request.dataSources.rooms.get(id);
                if(!room) {
                    reply.status(404).send({ message: "Room introuvable." });
                }

                const currentPlaying = await room?.service.getCurrentPlaying();
                const queue = await room?.service.getQueue();

                const {token, service, ...r}: any = room;

                reply.status(200).send({ 
                    room: { ...r, queue, currentPlaying } 
                });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

    fastify.get("/rooms/actions/:id/search", {
        schema: {
            ...idParamsCheck,
            querystring: {
                type: "object",
                required: ["q"],
                properties: {
                    q: { type: "string", minLength: 1 }
                },
                additionalProperties: false
            }
        },
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const {id} = req.params as {id: string};
                const {q} = req.query as {q: string};
                if(!q?.trim()) {
                    reply.status(200).send({ items: [] });
                }

                const room = await req.dataSources.rooms.get(id);
                if(!room) {
                    reply.status(404).send("Room not found");
                }
                reply.status(200).send({ items: await room?.service.search(q) });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({
                    message: error.message,
                    stack: error.stack
                });
            }
        }
    })

    fastify.post("/rooms/actions/:id/add-to-queue", {
        schema: {
            ...idParamsCheck,
            body: {
                type: "object",
                required: ["track"],
                properties: {
                    track: {
                        type: "object",
                        required: ["id"],
                        properties: {
                            id: { type: "string", minLength: 1 },
                            name: { type: "string", minLength: 1 },
                            artists: { 
                                type: "array",
                                items: {
                                    type: "string",
                                    minLength: 1
                                },
                                minItems: 1 
                            },
                            image: { type: "string", minLength: 1 }
                        }
                    }
                }
            }
        },
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const {track} = req.body as {track: ITrack};
                const {id} = req.params as {id: string};
                const room = await req.dataSources.rooms.get(id);
                if(!room) {
                    reply.status(404).send({ message: "Room not found" });
                }

                await room?.service.addToQueue(track.id);
                await req.dataSources.rooms.sendMessage<RoomEvents.Music.Added>(room?.id!, {
                    type: "MUSIC_ADDED",
                    data: { track }
                });

                reply.status(200).send({ message: `Music ${track.name} queued !` });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    })

    fastify.post("/rooms/actions/:id/skip-next", {
        schema: idParamsCheck,
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const {id} = req.params as {id: string};
                const room = await req.dataSources.rooms.get(id);
                if(!room) {
                    reply.status(404).send({ message: "Room not found" });
                }

                const newTrack = await room?.service.skipNext();
                if(newTrack) {
                    await req.dataSources.rooms.sendMessage<RoomEvents.Music.Switched>(room?.id!, {
                        type: "MUSIC_SWITCHED",
                        data: { newTrack }
                    });
                }

                reply.status(200).send({ message: `Music ${newTrack?.name} played !` });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

    fastify.post("/rooms/actions/:id/skip-previous", {
        schema: idParamsCheck,
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const {id} = req.params as {id: string};
                const room = await req.dataSources.rooms.get(id);
                if(!room) {
                    reply.status(404).send({ message: "Room not found" });
                }

                const newTrack = await room?.service.skipPrevious();
                if(newTrack) {
                    await req.dataSources.rooms.sendMessage<RoomEvents.Music.Switched>(room?.id!, {
                        type: "MUSIC_SWITCHED",
                        data: { newTrack }
                    });
                }

                reply.status(200).send({ message: `Music ${newTrack?.name} played !` });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

}
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ITrack } from "../../business/musics/MusicService";
import { RoomEvents } from "../../dataSources/rooms";

export default (fastify: FastifyInstance) => {

    fastify.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
        const { id } = req.params as { id: string; };        
        if (!id || typeof id !== 'string' || id.trim() === '') {
            return reply.status(400).send({ error: 'Invalid or missing room ID' });
        }

        const room = await req.dataSources.rooms.get(id);
        if(!room) {
            return reply.status(404).send("Room not found");
        }

        const member = room.members.find(m => m.id === req.me!.clientId);
        req.me!.member = member;

        //if the token sent by the user isn't equal to the current room do not allow actions on it
        if(room.id !== req.me?.roomId) {
            return reply.status(403).send("Cannot perform action in this room.");
        }

        req.room = room!;
    });

    fastify.get("/search", {
        schema: {
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
                const {q} = req.query as {q: string};
                if(!q?.trim()) {
                    return reply.status(200).send({ items: [] });
                }

                const room = req.room;
                reply.status(200).send({ items: await room?.service.search(q) });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({
                    message: error.message,
                    stack: error.stack
                });
            }
        }
    });

    fastify.post("/add-to-queue", {
        schema: {
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
                const room = req.room;

                await room?.service.addToQueue(track.id);
                await req.dataSources.rooms.broadcast<RoomEvents.Music.Added>(room?.id!, {
                    type: "MUSIC_ADDED",
                    data: { track, by: req.me!?.member }
                });

                reply.status(200).send({ success: true });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    })

    fastify.post("/skip-next", {
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const room = req.room;
                const { currentPlaying: newTrack, queue: newQueue } = await room?.service.skipNext()!;
                await req.dataSources.rooms.broadcast<RoomEvents.Music.Switched>(room?.id!, {
                    type: "MUSIC_SWITCHED",
                    data: { newTrack: newTrack!, newQueue: newQueue!, by: req.me!?.member }
                });

                reply.status(200).send({ success: true });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

    fastify.post("/skip-previous", {
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const room = req.room;
                const { currentPlaying: newTrack, queue: newQueue } = await room?.service.skipPrevious()!;
                await req.dataSources.rooms.broadcast<RoomEvents.Music.Switched>(room?.id!, {
                    type: "MUSIC_SWITCHED",
                    data: { newTrack: newTrack!, newQueue: newQueue!, by: req.me!?.member}
                });

                reply.status(200).send({ success: true });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

    fastify.post("/play", {
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const room = req.room;
                const { currentPlaying: newTrack, queue: newQueue } = await room?.service.play()!;
                await req.dataSources.rooms.broadcast<RoomEvents.Music.Played>(room?.id!, { 
                    type: "MUSIC_PLAYED",
                    data: { newTrack: newTrack!, newQueue, by: req.me!?.member }
                });
                reply.status(200).send({ success: true });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

    fastify.post("/pause", {
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const room = req.room;
                const { currentPlaying: newTrack, queue: newQueue } = await room?.service.pause()!;
                await req.dataSources.rooms.broadcast<RoomEvents.Music.Paused>(room?.id!, { 
                    type: "MUSIC_PAUSED",
                    data: { newTrack: newTrack!, newQueue, by: req.me!?.member }
                });                
                reply.status(200).send({ success: true });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

}

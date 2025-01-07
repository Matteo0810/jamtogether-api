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
                const {token, service, ownerId, ...r}: any = room;

                const clientId = request.dataSources.rooms.generateClientId();

                reply.status(200).send({
                    generatedClientId: clientId, // can be not used (since the user already have one)
                    room: { 
                        ...r, 
                        queue, 
                        currentPlaying, 
                        player
                    } 
                });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({ message: error.message, stack: error.stack });
            }
        }
    });

}
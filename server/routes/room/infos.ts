import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import roomMiddleware from "../../middlewares/roomMiddleware";

export default (fastify: FastifyInstance) => {
    
    fastify.addHook('preHandler', roomMiddleware);

    fastify.get("/playlist/:playlistId", {
        schema: {
            params: {
                type: "object",
                required: ["playlistId"],
                properties: {
                    id: { type: "string", minLength: 1 }
                },
                additionalProperties: false
            }
        },
        handler: async (req: FastifyRequest, reply: FastifyReply) => {
            try {
                const room = req.room;
                const { playlistId } = req.params as { playlistId: string };
                reply.status(200).send({ playlist: await room?.service.getPlaylist(playlistId) });
            } catch(e) {
                const error = e as Error;
                reply.status(500).send({
                    message: error.message,
                    stack: error.stack
                });
            }
        }
    });

    fastify.get("/playlists", async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const room = req.room;
            reply.status(200).send({ items: await room?.service.getPlaylists() });
        } catch(e) {
            const error = e as Error;
            reply.status(500).send({
                message: error.message,
                stack: error.stack
            });
        }
    });

}

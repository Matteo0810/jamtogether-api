import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export default (fastify: FastifyInstance) => {

    fastify.get("/login", {
        handler: (request: FastifyRequest, reply: FastifyReply) => {
            reply.status(200).send({ 
                url: request.dataSources.spotify.getAuthorizationURL() 
            });
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
            try {
                const data = await request.dataSources.spotify.retrieveAccessToken(code);
                reply.status(200).send(data);
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
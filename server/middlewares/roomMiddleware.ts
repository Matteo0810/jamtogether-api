import { FastifyReply, FastifyRequest } from "fastify";

export default async (req: FastifyRequest, reply: FastifyReply) => {
    if(req.params) {
        const {id} = req.params as {id: string};
        if(id) {
            const room = await req.dataSources.rooms.get(id);
            if(!room) {
                reply.status(404).send("Room not found");
            }
            req.room = room;
        }
    }
}
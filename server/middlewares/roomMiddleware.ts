import { FastifyReply, FastifyRequest } from "fastify";

export default async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string; };
    if (!id || typeof id !== 'string' || id.trim() === '') {
        return reply.status(400).send({ error: 'Invalid or missing room ID' });
    }

    const room = await req.dataSources.rooms.get(id);
    if(!room) {
        return reply.status(404).send({ error: "Room not found" });
    }

    const member = room.members.find(m => m.id === req.me!.clientId);
    req.me!.member = member;

    //if the token sent by the user isn't equal to the current room do not allow actions on it
    if(room.id !== req.me?.roomId) {
        return reply.status(403).send({ error: "Cannot perform action in this room." });
    }

    req.room = room!;
}
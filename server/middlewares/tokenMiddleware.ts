import { FastifyReply, FastifyRequest } from "fastify";
import tokenService from "../business/tokenService";

export default async (request: FastifyRequest, reply: FastifyReply) => {
    const headers = request.headers as { authorization: string; }|undefined;
    if(headers?.authorization) {
        const authorization = headers.authorization;
        try {
            const token = await tokenService.unserialize(authorization);
        
            if(token) {
                request.me = token;
            }
        } catch(e) {
            reply.status(403).send({ message: "Access token expired" });
        }
    }
}
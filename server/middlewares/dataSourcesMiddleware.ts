import { FastifyReply, FastifyRequest } from "fastify";
import Rooms from "../dataSources/rooms";

export default (request: FastifyRequest, reply: FastifyReply, done: any) => {
    request.dataSources = {
        rooms: new Rooms()
    }
    done();
}
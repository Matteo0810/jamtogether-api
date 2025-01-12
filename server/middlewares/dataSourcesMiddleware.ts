import { FastifyReply, FastifyRequest } from "fastify";

import Rooms from "../dataSources/rooms";
import Spotify from "../dataSources/musics/spotify";

export default (request: FastifyRequest, reply: FastifyReply, done: any) => {
    request.dataSources = {
        rooms: new Rooms(),
        spotify: new Spotify()
    }
    done();
}
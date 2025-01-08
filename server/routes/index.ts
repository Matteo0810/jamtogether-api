import { FastifyInstance } from "fastify";

import spotify from "./spotify";

import rooms from "./rooms";
import roomActions from "./room/actions";

export default (instance: FastifyInstance) => {
    instance.register(spotify, { prefix: "spotify" });

    // rooms and room actions
    instance.register(rooms, { prefix: "rooms" });
    instance.register(roomActions, { prefix: "rooms/actions/:id" });

}
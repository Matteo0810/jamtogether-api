import { FastifyInstance } from "fastify";

import spotify from "./spotify";

import rooms from "./rooms";
import roomActions from "./room/actions";
import roomInfos from "./room/infos";

export default (instance: FastifyInstance) => {
    instance.register(spotify, { prefix: "spotify" });

    // rooms and room actions
    instance.register(rooms, { prefix: "rooms" });
    instance.register(roomActions, { prefix: "rooms/actions/:id" });
    instance.register(roomInfos, { prefix: "rooms/infos/:id" });

}
import { FastifyInstance } from "fastify";
import roomMiddleware from "../middlewares/roomMiddleware";

import rooms from "./rooms";
import spotify from "./spotify";
import roomsActions from "./roomsActions";

export default (instance: FastifyInstance) => {

    instance.addHook("preHandler", roomMiddleware);
    instance.register(rooms, { prefix: "rooms" });
    instance.register(spotify, { prefix: "spotify" });
    instance.register(roomsActions, { prefix: "rooms/actions/:id" });

}
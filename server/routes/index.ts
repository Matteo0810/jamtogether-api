import { FastifyInstance } from "fastify";
import roomMiddleware from "../middlewares/roomMiddleware";

export default (instance: FastifyInstance) => {

    instance.addHook("preHandler", roomMiddleware);
    instance.register(import("./rooms"), { prefix: "rooms" });
    instance.register(import("./spotify"), { prefix: "spotify" });
    instance.register(import("./roomsActions"), { prefix: "rooms/actions/:id" });

}
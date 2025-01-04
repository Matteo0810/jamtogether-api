import 'fastify';
import Rooms from './server/dataSources/rooms';

interface IDataSource {
    rooms: Rooms;
}

declare module 'fastify' {

    interface FastifyRequest {
        dataSources: IDataSource;
    }

}

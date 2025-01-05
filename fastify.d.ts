import 'fastify';
import Rooms, { IRoom } from './server/dataSources/rooms';
import MusicService from './server/business/musicServices/MusicService';

interface IDataSource {
    rooms: Rooms;
}

declare module 'fastify' {

    interface FastifyRequest {
        dataSources: IDataSource;
        room?: IRoom&{service: MusicService};
    }

}

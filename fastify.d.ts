import 'fastify';
import Rooms, { IRoom } from './server/dataSources/rooms';

import MusicService from './server/business/musics/MusicService';
import { IToken } from './server/business/tokenService';

interface IDataSource {
    rooms: Rooms;
}

declare module 'fastify' {

    interface FastifyRequest {
        dataSources: IDataSource;

        room?: IRoom&{service: MusicService};
        me?: IToken;
    }

}

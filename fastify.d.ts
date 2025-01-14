import 'fastify';
import Rooms, { IRoom, IRoomMember } from './server/dataSources/rooms';

import MusicService from './server/business/musics/MusicService';
import { IToken } from './server/business/tokenService';
import Spotify from './server/dataSources/musics/spotify';

interface IDataSource {
    rooms: Rooms;
    spotify: Spotify;
}

declare module 'fastify' {

    interface FastifyRequest {
        dataSources: IDataSource;

        room?: IRoom&{service: MusicService};
        me?: IToken&{member?: IRoomMember};
    }

}

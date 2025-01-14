import Rooms, { IRoom, RoomEvents } from "../../dataSources/rooms";
import { sleep } from "../../helpers/globalUtils";

import redis from "../../services/redis";

import MusicService, { IMusicToken, IPlayer, IQuerySearch, ITrack, IUserProfile, TQueue } from "./MusicService";
import Spotify from "../../dataSources/musics/spotify";
import logger from "../../services/logger";

export interface ISpotifyCredentials {
    access_token: string
    refresh_token: string
    scope: string
    expires_at: number;
    expires_in: number
    token_type: string
};

interface ISpotifyTrackObject {
    uri: string;
    is_playable: boolean;
    name: string;
    artists: {
        name: string;
    }[];
    album: {
        images: {
            url: string;
        }[];
    }
    duration_ms: number;
};

interface IRoomCache {
    roomId: string;
    states: {
        songId: string;
        isPlaying: boolean;
        deviceName: string;
    }
}

export default class SpotifyService extends MusicService {

    // listener caches (only for spotify)
    private static cache: Map<string, IRoomCache> = new Map();

    public constructor(token: IMusicToken) {
        super("https://api.spotify.com/v1", token);
        SpotifyService.startEvents(); // start intern events listeners
    }

    public async generateToken(oldToken: IMusicToken): Promise<IMusicToken> {
        const refreshToken = oldToken.refreshToken;
        const dataSource = new Spotify();
        try {
            const data = await dataSource.useRefreshToken(refreshToken);
            return { 
                type: oldToken.type,
                authorization: `${data.token_type} ${data.access_token}`,
                expiresAt: data.expires_at,
                refreshToken: data.refresh_token || refreshToken 
            }
        } catch(e) {
            throw e;
        }
    }

    public static async startEvents(): Promise<void> {
        const threadInterval = 10e5 // 5 seconds // TODO decrease once a solution has been found

        // TODO
        // // will create another thread
        // const rooms = new Rooms();
        // try {
        //     await new Promise((resolve) => resolve(
        //         setInterval(async () => {
        //             const roomIds = await redis.keys("room:*");
        //             roomIds.forEach(async roomKey => {
        //                 const roomId = roomKey.split(":").pop()!;
        //                 const result = await redis.get(roomKey);
        //                 if(!result && SpotifyService.cache.has(roomId)) {
        //                     SpotifyService.cache.delete(roomId);
        //                 } else if(result) {
        //                     const room = JSON.parse(result) as IRoom;
        //                     const spotifyService = new SpotifyService(room!.token);
        //                     const cachedRoom = SpotifyService.getCache(roomId);
                            
        //                     const {currentPlaying, queue} = await spotifyService.getQueue();
        //                     const {isPlaying, deviceName} = await spotifyService.getPlayer();

        //                     if(deviceName !== cachedRoom?.states?.deviceName) {
        //                         logger.info(`[SpotifyCache] New device deteched for room ${roomId}, handeling event...`);
        //                         cachedRoom.states.deviceName = deviceName;
        //                         await rooms.broadcast<{ deviceName: string; }>(cachedRoom.roomId, {
        //                             type: "NEW_DEVICE",
        //                             data: { deviceName }
        //                         });
        //                     }

        //                     if(isPlaying !== cachedRoom?.states.isPlaying) {
        //                         logger.info(`[SpotifyCache] Music ${isPlaying ? "Played" : "Paused"} for room ${roomId}, handeling event...`);
        //                         cachedRoom.states.isPlaying = isPlaying;
        //                         await rooms.broadcast<RoomEvents.Music.Played|RoomEvents.Music.Paused>(cachedRoom.roomId, {
        //                             type: isPlaying ? "MUSIC_PLAYED" : "MUSIC_PAUSED"
        //                         });
        //                     }

        //                     if(currentPlaying?.id !== cachedRoom.states.songId) {
        //                         logger.info(`[SpotifyCache] The music has changed in room ${roomId}, handeling event...`);
        //                         await rooms.broadcast<RoomEvents.Music.Switched>(cachedRoom.roomId, {
        //                             type: "MUSIC_SWITCHED",
        //                             data: { newQueue: queue, newTrack: currentPlaying! }
        //                         });

        //                         cachedRoom.states.songId = currentPlaying?.id!;
        //                     }
        //                 }
        //             })
        //         }, threadInterval)
        //     ));
        // } catch(e) {
        //     const error = e as Error;
        //     logger.error(error);
        // }
    }

    public async addToQueue(id: string): Promise<void> {
        await this.request({
            endpoint: "/me/player/queue",
            method: "POST",
            query: {
                uri: id
            }
        })
    }

    public async getQueue(): Promise<TQueue> {
        const response = await this.request<{
            currently_playing: ISpotifyTrackObject|null,
            queue: Array<ISpotifyTrackObject>
        }>({ endpoint: "/me/player/queue" });

        if(!response) return { queue: [], currentPlaying: null };
        return {
            queue: response?.queue
                .map(item => ({
                    name: item.name,
                    artists: item.artists.map(artist => artist.name),
                    image: item.album.images[0].url,
                    id: item.uri
                })) as Array<ITrack>,
            currentPlaying: response.currently_playing ? {
                id: response.currently_playing.uri,
                artists: response.currently_playing.artists.map(({name}) => name),
                image: response.currently_playing.album.images[0].url,
                name: response.currently_playing.name,
                duration: response.currently_playing.duration_ms
            } : null
        };
    }

    public async pause(): Promise<TQueue> {
        await this.request({
            endpoint: "/me/player/pause",
            method: "PUT"
        });

        // wait before the song is played
        await sleep(200);
        return this.getQueue();
    }

    public async getPlayer(): Promise<IPlayer> {
        const response = await this.request<{
            is_playing: boolean;
            device: {
                name: string;
            }
        }>({ endpoint: "/me/player", method: "GET" });
        return response ? {
            isPlaying: response.is_playing,
            deviceName: response.device.name
        } : { isPlaying: false, deviceName: "unknown" }
    }

    public async play(): Promise<TQueue> {
        await this.request({
            endpoint: "/me/player/play",
            method: "PUT"
        });

        // wait before the song is played
        await sleep(200);
        return this.getQueue();
    }

    public async skipNext(): Promise<TQueue> {
        await this.request({
            endpoint: "/me/player/next",
            method: "POST"
        });
        // wait before the song is played
        await sleep(200);
        return this.getQueue();
    }

    public async skipPrevious(): Promise<TQueue> {
        await this.request({
            endpoint: "/me/player/previous",
            method: "POST"
        });
        // wait before the song is played
        await sleep(200);
        return this.getQueue();
    }

    public async search(query: string): Promise<IQuerySearch> {
        const response = await this.request<{
            tracks: {
                total: number;
                items: Array<ISpotifyTrackObject>;
            }
        }>({
            endpoint: "/search",
            query: {
                type: 'track',
                q: query,
                limit: 10
            }
        });

        if(!response) return [];

        return response.tracks.items
            .filter(item => item.is_playable)
            .map(item => ({
                name: item.name,
                artists: item.artists.map(artist => artist.name),
                image: item.album.images[0].url,
                id: item.uri
            })) as IQuerySearch
    }

    public async getUserProfile(): Promise<IUserProfile | null> {
        const response = await this.request<{
            display_name: string;
            id: string;
            product: "premium"|"free";
        }>({
            endpoint: "/me",
            method: "GET"
        });
        
        if(!response) return null;
        return response ? {
            isPremium: response.product === "premium",
            displayName: response.display_name,
            id: response.id
        } : null;
    }

    private static getCache(roomId: string): IRoomCache {
        if(!SpotifyService.cache.has(roomId)) {
            SpotifyService.cache.set(roomId, {
                roomId,
                states: {
                    songId: "",
                    deviceName: "",
                    isPlaying: false
                }
            });
        }
        return SpotifyService.cache.get(roomId)!;
    }

    private static initCache(data: IRoomCache): void {
        SpotifyService.cache.set(data.roomId, {
            roomId: data.roomId,
            states: data.states
        });
    }

}
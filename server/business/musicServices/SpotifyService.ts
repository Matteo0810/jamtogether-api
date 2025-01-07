import queryString from "query-string";
import { RoomEvents } from "../../dataSources/rooms";
import MusicService, { IMusicToken, IPlayer, IQuerySearch, ITrack, TQueue } from "./MusicService";

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
    intervals: Map<string, NodeJS.Timeout>;
    states: {
        currentSong: {
            id: string;
        };
        isPlaying: boolean;
    }
}

export default class SpotifyService extends MusicService {

    // listener caches (only for spotify)
    private static cache: Map<string, IRoomCache> = new Map();

    public constructor(token: IMusicToken) {
        super("https://api.spotify.com/v1", token);
    }

    public async generateToken(oldToken: IMusicToken): Promise<IMusicToken> {
        const refreshToken = oldToken.refreshToken;
        const client_id = process.env.SPOTIFY_CLIENT_ID!;
        const client_secret = process.env.SPOTIFY_CLIENT_SECRET!;

        try {
            const params = queryString.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            })
            const response = await fetch("https://accounts.spotify.com/api/token?"+params, {
                method: "POST",
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
                }
            });

            const data = await response.json();
            if(!response.ok) {
                throw new Error(JSON.stringify(data) ?? "HTTP Error ! " + response.status);
            }                

            return { 
                ...data,
                refresh_token: data.refresh_token || refreshToken 
            }
        } catch(e) {
            throw e;
        }
    }

    public async startListeners(roomId: string): Promise<void> {
        const {currentPlaying} = await this.getQueue();
        const player = await this.getPlayer();

        // init the cache with real state data
        if(currentPlaying && player) {
            SpotifyService.initCache({
                roomId,
                states: {
                    currentSong: {
                        id: currentPlaying.id!,
                    },
                    isPlaying: player.isPlaying!
                }
            });
        }

        // then retrieve the cache (defined bellow)
        const cache = SpotifyService.getCache(roomId);

        // enable all listeners
        this.waitUntilSongPlayingStatusSwitched(cache);
        this.waitUntilSongIsEnded(cache);
    }

    public removeListeners(roomId: string): void {
        // clear all active interval because there no garbage collector to do that
        SpotifyService.getCache(roomId)
            .intervals.values()
            .forEach(i => clearInterval(i));

        // then delete the room from the cache
        SpotifyService.cache.delete(roomId);
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
        await new Promise((resolve) => setTimeout(resolve, 200));
        return this.getQueue();
    }

    public async getPlayer(): Promise<IPlayer|null> {
        const response = await this.request<{
            is_playing: boolean;
            device: {
                name: string;
            }
            progress_ms: number;
        }>({
            endpoint: "/me/player",
            method: "GET"
        });
        if(!response) return null;
        return {
            isPlaying: response.is_playing,
            musicTimeRemaing: response.progress_ms,
            deviceName: response.device.name
        }
    }

    public async play(): Promise<TQueue> {
        await this.request({
            endpoint: "/me/player/play",
            method: "PUT"
        });

        // wait before the song is played
        await new Promise((resolve) => setTimeout(resolve, 200));
        return this.getQueue();
    }

    public async skipNext(): Promise<TQueue> {
        await this.request({
            endpoint: "/me/player/next",
            method: "POST"
        });
        // wait before the song is played
        await new Promise((resolve) => setTimeout(resolve, 200));
        return this.getQueue();
    }

    public async skipPrevious(): Promise<TQueue> {
        await this.request({
            endpoint: "/me/player/previous",
            method: "POST"
        });
        // wait before the song is played
        await new Promise((resolve) => setTimeout(resolve, 200));
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

    private async waitUntilSongPlayingStatusSwitched(cache: IRoomCache) {
        if(!cache.intervals.has("playingStatus")) {
            cache.intervals.set("playingStatus", setInterval(async () => {
                const player = await this.getPlayer();
                
                if(player && player?.isPlaying !== cache.states.isPlaying) {
                    cache.states.isPlaying = player?.isPlaying;
                    await this.rooms.broadcast<RoomEvents.Music.Played|RoomEvents.Music.Paused>(cache.roomId, {
                        type: player!.isPlaying ? "MUSIC_PLAYED" : "MUSIC_PAUSED"
                    });
                }
            }, 2e3)); // you can increase the time if you might think that is not enought
        }
    }

    private async waitUntilSongIsEnded(cache: IRoomCache) {
        // song switch happend in two cases: if the song is ended or is switched by the owner on spotify
        if(!cache.intervals.has("songSwitchDetection")) {
            cache.intervals.set("songSwitchDetection", setInterval(async () => {
                const {currentPlaying, queue} = await this.getQueue();
                if(
                    currentPlaying?.id !== cache.states.currentSong.id
                ) {
                    await this.rooms.broadcast<RoomEvents.Music.Switched>(cache.roomId, {
                        type: "MUSIC_SWITCHED",
                        data: { newQueue: queue, newTrack: currentPlaying! }
                    });

                    cache.states.currentSong.id = currentPlaying?.id!;
                }
            }, 2e3)); // can be change as well
        }
    }

    private static getCache(roomId: string): IRoomCache {
        if(!SpotifyService.cache.has(roomId)) {
            SpotifyService.cache.set(roomId, {
                roomId,
                intervals: new Map(),
                states: {
                    currentSong: {
                        id: "",
                    },
                    isPlaying: false
                }
            });
        }
        return SpotifyService.cache.get(roomId)!;
    }

    private static initCache(data: Omit<IRoomCache, "intervals">): void {
        SpotifyService.cache.set(data.roomId, {
            roomId: data.roomId,
            intervals: new Map(),
            states: data.states
        });
    }

}
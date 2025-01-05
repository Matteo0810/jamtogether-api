import MusicService, { IMusicToken, IPlayer, IQuerySearch, ITrack, TQueue } from "./MusicService";

// TODO: déclancher un broadcast quand un son spotify est fini.

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
};

export default class SpotifyService extends MusicService {
    
    public constructor(token: IMusicToken) {
        super("https://api.spotify.com/v1", token);
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
                name: response.currently_playing.name
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
        }>({
            endpoint: "/me/player",
            method: "GET"
        });
        if(!response) return null;
        return {
            isPlaying: response.is_playing
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

}
import MusicService, { IMusicToken, IQuerySearch, ITrack } from "./MusicService";

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

    public async getCurrentPlaying(): Promise<ITrack|null> {
        const response = await this.request<{item: ISpotifyTrackObject}|null>({
            endpoint: "/me/player/currently-playing"
        });
        if(!response) return null;
        const item = response.item;
        return {
            id: item.uri,
            artists: item.artists.map(({name}) => name),
            image: item.album.images[0].url,
            name: item.name
        }
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

    public async getQueue(): Promise<Array<ITrack>> {
        const response = await this.request<{
            queue: Array<ISpotifyTrackObject>
        }>({ endpoint: "/me/player/queue" });

        if(!response) return [];
        return response?.queue
            .map(item => ({
                name: item.name,
                artists: item.artists.map(artist => artist.name),
                image: item.album.images[0].url,
                id: item.uri
            })) as Array<ITrack>;
    }

    public async pause(): Promise<void> {
        await this.request({
            endpoint: "/me/player/pause",
            method: "POST"
        });
    }

    public async play(): Promise<void> {
        await this.request({
            endpoint: "/me/player/play",
            method: "POST"
        });
    }

    public async skipNext(): Promise<ITrack|null> {
        await this.request({
            endpoint: "/me/player/next",
            method: "POST"
        });
        // wait before the song is played
        await new Promise((resolve) => setTimeout(resolve, 200));
        return this.getCurrentPlaying();
    }

    public async skipPrevious(): Promise<ITrack|null> {
        await this.request({
            endpoint: "/me/player/previous",
            method: "POST"
        });
        // wait before the song is played
        await new Promise((resolve) => setTimeout(resolve, 200));
        return this.getCurrentPlaying();
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
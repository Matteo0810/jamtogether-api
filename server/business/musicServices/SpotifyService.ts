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

export default class SpotifyService extends MusicService {
    
    private currentSongDuration: number;
    private currentPlayingId?: string|null;
    private currentSongRemaningDuration: number;

    private isPlaying: boolean;

    public constructor(token: IMusicToken) {
        super("https://api.spotify.com/v1", token);

        this.currentSongDuration = 0;
        this.currentSongRemaningDuration = 0;
        this.isPlaying = false;

        this.waitUntilSongEnd();
        this.waitUntilSongStatusSwitched();
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
        if(response.currently_playing) {
            this.currentSongDuration = response.currently_playing?.duration_ms;
            this.currentSongRemaningDuration = 0
        }
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
        this.isPaused = true;

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
        }>({
            endpoint: "/me/player",
            method: "GET"
        });
        if(!response) return null;
        this.isPlaying = response.is_playing;
        return {
            isPlaying: response.is_playing,
            deviceName: response.device.name
        }
    }

    public async play(): Promise<TQueue> {
        await this.request({
            endpoint: "/me/player/play",
            method: "PUT"
        });
        this.isPaused = false;

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

    public async waitUntilSongStatusSwitched() {        
        // setInterval(async () => {
        //     const player = await this.getPlayer();

        //     if(player?.isPlaying !== this.isPlaying) {
        //         this.listener.emit("musicStatusChanged", player?.isPlaying);
        //         this.isPlaying = player!.isPlaying;
        //     }
        // }, 2e3);
    }

    public async waitUntilSongEnd() {        
        // setInterval(async () => {
        //     const {currentPlaying} = await this.getQueue();

        //     if(
        //         currentPlaying?.id !== this.currentPlayingId || 
        //         this.currentSongRemaningDuration >= this.currentSongDuration
        //     ) {
        //         this.listener.emit("musicEnded");
        //         this.currentPlayingId = currentPlaying?.id;
        //         this.currentSongRemaningDuration = 0;
        //     }
        //     if(!this.isPlaying) {
        //         this.currentSongRemaningDuration++;
        //     }
        // }, 3e3);
    }

}
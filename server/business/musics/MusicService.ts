import queryString from "query-string";
import Rooms from "../../dataSources/rooms";

export type IMusicService = "SPOTIFY";
export interface IMusicToken {
    type: IMusicService;
    authorization: string;
    expiresAt: number;
    refreshToken: string;
}

interface IRequestParams {
    endpoint: string;     
    query?: Record<string, unknown>;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";  
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
}

export interface ITrack {
    id: string;
    name: string;
    artists: Array<string>;
    image: string;
    duration: number;
}

export interface IPlayer {
    isPlaying: boolean;
    deviceName: string;
    musicTimeRemaing: number;
}

export interface IUserProfile {
    id: string;
    isPremium: boolean;
    displayName: string;
}

export type TQueue = { queue: Array<ITrack>, currentPlaying: ITrack|null };
export type IQuerySearch = Array<ITrack>;

export default abstract class MusicService {
    
    private token: IMusicToken;
    
    private readonly baseURL: string;
    protected readonly rooms: Rooms;

    public constructor(baseURL: string, token: IMusicToken) {
        this.token = token;
        this.baseURL = baseURL;
        this.rooms = new Rooms();
    }

    public async request<T = {}>({ endpoint, body, query, headers, method = "GET" }: IRequestParams): Promise<T|null> {
        let url = this.baseURL;
        if(!url.endsWith("/") && !endpoint.startsWith("/")) 
            url+="/";

        url+= endpoint;
        if(query) {
            url+=`?${queryString.stringify(query)}`;
        }

        const response = await fetch(url, {
            method,
            headers: {
                ...headers,
                'Authorization': await this.getAuthorization()
            },
            ...body && { body: JSON.stringify(body) }
        });

        const text = await response.text();
        
        if(!text?.trim())
            return null;
        
        try {
            const data = JSON.parse(text);
            if(!response.ok) {
                throw new Error(data?.error?.message ?? "HTTP ERROR ! " + response.statusText);
            }
            
            return data as T;
        } catch(e) {
            console.error(e);
        } // ignore
        return null;
    }

    // authorization
    private async getAuthorization(): Promise<string> {
        // if tokens expires, then refresh another (using generateToken from the service wished)
        if(this.hasTokenExpired()) {
             this.token = await this.generateToken(this.token);
        }
        return this.token.authorization;
    }

    private hasTokenExpired(): boolean {
        return Date.now() >= this.token.expiresAt;
    }
    public abstract generateToken(oldToken: IMusicToken): Promise<IMusicToken>;

    // listeners
    public abstract startListeners(roomId: string): void;
    public abstract removeListeners(roomId: string): void;

    // user's queue
    public abstract addToQueue(id: string): Promise<void>;
    public abstract getQueue(): Promise<TQueue>;
    
    // api search musics
    public abstract search(query: string): Promise<IQuerySearch>;
    
    // player
    public abstract skipNext(): Promise<TQueue>;
    public abstract skipPrevious(): Promise<TQueue>;

    public abstract pause(): Promise<TQueue>;
    public abstract play(): Promise<TQueue>;

    public abstract getPlayer(): Promise<IPlayer|null>;

    public abstract getUserProfile(): Promise<IUserProfile|null>;
}

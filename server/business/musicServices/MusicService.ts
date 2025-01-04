import queryString from "query-string";

export type IMusicService = "SPOTIFY";
export interface IMusicToken {
    type: IMusicService;
    authorization: string;
}

interface IRequestParams {
    endpoint: string;     
    query?: Record<string, unknown>;
    method?: "GET" | "POST";  
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
}

export interface ITrack {
    id: string;
    name: string;
    artists: Array<string>;
    image: string;
}

export type IQuerySearch = Array<ITrack>;

export default abstract class MusicService {

    private readonly token: IMusicToken;
    private readonly baseURL: string;

    public constructor(baseURL: string, token: IMusicToken) {
        this.token = token;
        this.baseURL = baseURL;
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
                'Authorization': this.token.authorization
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
        } catch(e) {} // ignore
        return null;
    }

    // user's queue
    public abstract addToQueue(id: string): Promise<void>;
    public abstract getQueue(): Promise<Array<ITrack>>;
    
    // api search musics
    public abstract search(query: string): Promise<IQuerySearch>;
    
    // player
    public abstract skipNext(): Promise<ITrack|null>;
    public abstract skipPrevious(): Promise<ITrack|null>;

    public abstract pause(): Promise<void>;
    public abstract play(): Promise<void>;
    
    // current playing 
    public abstract getCurrentPlaying(): Promise<ITrack|null>;

}
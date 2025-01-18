import queryString from "query-string";
import {v4 as uuid} from "uuid";
import { ISpotifyCredentials } from "../../business/musics/SpotifyService";

interface IRequestParams {
    params?: Record<string, unknown>;
}

export default class Spotify {

    private readonly baseURL: string = "https://accounts.spotify.com";
    private readonly clientId: string = process.env.SPOTIFY_CLIENT_ID!;
    private readonly clientSecret: string = process.env.SPOTIFY_CLIENT_SECRET!;

    private async request<T>({ params }: IRequestParams): Promise<T> {
        const stringifiedParams = params ? "?"+queryString.stringify(params) : "";
        const response = await fetch(this.baseURL+"/api/token"+stringifiedParams, {
            method: "POST",
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64')
            }
        });
        const data = await response.json();
        if(!response.ok) {
            throw new Error(data?.error_description ?? data?.error ?? "HTTP Error ! " + response.status);
        }
        return data as T;
    }

    private computeExpiresAt(expiresIn: number) {
        const currentDate = Date.now();
        return currentDate + expiresIn * 1000;
    }

    public async useRefreshToken(refreshToken: string) {
        const data = await this.request<ISpotifyCredentials>({
            params: {
                grant_type: "refresh_token",
                refresh_token: refreshToken
            }
        });
        data.expires_at = this.computeExpiresAt(data.expires_in);
        return data;
    }

    public async retrieveAccessToken(code: string) {
        const data = await this.request<ISpotifyCredentials>({
            params: {
                code,
                redirect_uri: process.env.WEBSITE_URL+"/create-room",
                grant_type: "authorization_code"
            }
        });
        data.expires_at = this.computeExpiresAt(data.expires_in);
        return data;
    }
    
    public getAuthorizationURL() {
        const state = uuid();
        const redirect_uri = process.env.WEBSITE_URL+"/create-room";

        const scope = [
            'playlist-read-private',
            'app-remote-control', 
            'user-read-currently-playing', 
            'user-read-playback-position', 
            'user-read-private',
            'user-modify-playback-state',
            'user-read-playback-state'
        ];
        
        return this.baseURL+'/authorize?' +
            queryString.stringify({
                response_type: 'code',
                client_id: this.clientId,
                scope: scope.join(" "),
                redirect_uri,
                state
            });
    }

}
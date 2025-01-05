import {v4 as uuid} from "uuid";

import redis from "../services/redis";

import MusicService, { IMusicToken, ITrack, TQueue } from "../business/musicServices/MusicService";
import SpotifyService from "../business/musicServices/SpotifyService";
import { webSocketConnections } from "../services/websocket";

export declare namespace RoomEvents {

    namespace Member {
        interface Joined { member: IRoomMember; }
        interface Leaved { member: IRoomMember; }
        
        type MessageType = "MEMBER_JOINED" |  "MEMBER_LEAVED";
    }
    namespace Music {
        interface Added { track: ITrack; }
        interface Removed { track: ITrack; }
        interface Switched { newTrack: ITrack; newQueue: Array<ITrack>; }
        interface Played { newTrack: ITrack, newQueue: Array<ITrack> }
        interface Paused { newTrack: ITrack, newQueue: Array<ITrack> }

        type MessageType = "MUSIC_ADDED" | "MUSIC_REMOVED" | "MUSIC_SWITCHED" | "MUSIC_PLAYED" | "MUSIC_PAUSED";
    }

    type MessageType = Music.MessageType | Member.MessageType;
    interface IncomingMessage<T = {}> {
        date: Date;
        type: RoomEvents.MessageType;
        data?: T;
    }

}

export interface IRoomMember {
    id: string;
    displayName: string;
}

export interface IRoom {
    id: string;
    ownerId: string;
    members: Array<IRoomMember>;
    createdAt: Date;

    history: RoomEvents.IncomingMessage[];
    token: IMusicToken;
}

export default class Rooms {

    private generateRoomId() {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const digits = "0123456789";
        let result = "";
      
        for (let i = 0; i < 6; i++) {
          result += letters[Math.floor(Math.random() * letters.length)];
          result += digits[Math.floor(Math.random() * digits.length)];
        }
      
        return `R-${result}`;
    }

    public generateClientId() {
        return `user-${uuid()}`;
    }

    public async create(token: IMusicToken): Promise<IRoom> {
        const clientId = this.generateClientId();

        const room: IRoom = {
            id: this.generateRoomId(),
            ownerId: clientId,
            createdAt: new Date(),
            token,

            history: [],
            members: [],
        };

        const key = `room:${room.id}`;

        await redis.set(key, JSON.stringify(room));
        this.join(room, clientId);
        return room;
    }
    
    public async update(id: string, props: Partial<IRoom>): Promise<IRoom> {
        const room = await this.get(id);
        if(!room) {
            throw new Error("room not found");
        }
        delete (room as any).service;
        const newRoomData = {...room, ...props};
        await redis.set(`room:${id}`, JSON.stringify(newRoomData));
        return newRoomData;
    }

    public async get(id: string): Promise<IRoom&{service: MusicService}|null> {
        const r = await redis.get(`room:${id}`);
        if(!r) return null;

        const room = JSON.parse(r) as IRoom;
        const service = new SpotifyService(room.token);
        const result = Object.assign({}, room, { service });
        return result;
    }

    public async delete(id: string): Promise<IRoom> {
        const room = await this.get(id);
        if(!room) {
            throw new Error("Room not found.");
        }

        const subscriptionKey = `room:${id}`;
        await redis.del(subscriptionKey);
        return room;
    }

    public async join(room: IRoom, clientId: string): Promise<IRoom> {
        if(room.members.findIndex(({id}) => id === clientId) !== -1) {
            throw new Error("Client id already joined.");
        }
        const member: IRoomMember = {
            id: clientId, 
            displayName: clientId
        };

        await this.update(room.id, {
            members: [...room.members, member]
        });
        await this.broadcast<RoomEvents.Member.Joined>(room.id, {
            type: "MEMBER_JOINED",
            data: { member }
        });

        return room;
    }

    public async leave(room: IRoom, clientId: string): Promise<IRoom> {
        const clientIndex = room.members.findIndex(({id}) => id === clientId);
        if(clientIndex === -1) {
            throw new Error("Client id is not in this room.");
        }
        const member = room.members.at(clientIndex)!;

        room.members.splice(clientIndex, 1);

        await this.update(room.id, {
            members: room.members
        });
        await this.broadcast<RoomEvents.Member.Leaved>(room.id, {
            type: "MEMBER_LEAVED",
            data: { member }
        });

        return room;
    }

    public async broadcast<T>(id: string, message: Omit<RoomEvents.IncomingMessage<T>, "date">): Promise<void> {
        const room = await this.get(id);
        if(!room) return;
        
        const membersValidWebsockets = room.members
            .map(({id: uid}) => webSocketConnections[uid])
            .filter(ws => !!ws);

        // broadcast the message to all members
        membersValidWebsockets.forEach(ws => {
            ws.send(JSON.stringify(message));
        });

        // then put it in the history
        this.update(room.id, {
            history: [...room.history, message as RoomEvents.IncomingMessage]
        })
    }

}
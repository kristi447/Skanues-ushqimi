export interface Member {
  id: string;
  nickname: string;
  avatarId: string;
  online: boolean;
}

export interface Room {
  id: string;
  name: string;
  online?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  sentAt: number;
  status: 'sending' | 'sent' | 'failed';
}

export interface Session {
  token: string;
  user: Member;
}

export type CodeResult = { ok: true; ticket: string } | { ok: false; message: string };

export type LinkStatus = 'connecting' | 'live' | 'lost';

export interface RoomEvents {
  onHistory(messages: ChatMessage[]): void;
  onMessage(message: ChatMessage): void;
  onMembers(members: Member[]): void;
  onPresence(memberId: string, online: boolean): void;
  onStatus(status: LinkStatus): void;
}

export interface RoomLink {
  send(text: string): Promise<ChatMessage>;
  close(): void;
}

/**
 * Everything the UI needs from a server. Swap implementations in src/api/index.ts.
 * `ticket` is what a correct access code earns; it gates register/resume.
 */
export interface Backend {
  verifyCode(code: string): Promise<CodeResult>;
  register(ticket: string, nickname: string, avatarId: string): Promise<Session>;
  resume(ticket: string, session: Session): Promise<Session>;
  listRooms(session: Session): Promise<Room[]>;
  joinRoom(session: Session, roomId: string, events: RoomEvents): RoomLink;
}

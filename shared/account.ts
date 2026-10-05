import type { Credentials, RoomView } from "./protocol";
export const MIN_PASSWORD_LENGTH = 8;

export type AccountProfile = {
  id: string;
  username: string;
  name: string;
  photo: string | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
  totalXp: number;
  favorites: string[];
};
export type AuthResult = {
  credentials: Credentials;
  profile: AccountProfile;
  recoveryCode?: string;
};
export type Friend = {
  photoVersion?: string | null;
  id: string;
  username: string;
  name: string;
  online: boolean;
  presence: "offline" | "online" | "lobby" | "playing";
};
export type FriendRequest = { id: string; player: Friend };
export type FriendPhotos = Record<string, string | null>;
export type Invitation = {
  themeId?: import("./themes").ThemeId;
  id: string;
  kind: "duel" | "rematch";
  player: Friend;
  expiresAt: number;
};
export type SocialState = {
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  invitations: Invitation[];
  sentInvitations: Invitation[];
};
export type MatchSummary = {
  themeId?: import("./themes").ThemeId;
  id: string;
  finishedAt: number;
  mode: "duel" | "solo";
  players: RoomView["players"];
  winnerId: string | null;
  reason: RoomView["reason"];
  rounds: number;
};
export type HistoryPage = { matches: MatchSummary[]; next: number | null };
export type ModeStatistics = {
  played: number;
  completed: number;
  interrupted: number;
  wins: number;
  losses: number;
  draws: number;
  correct: number;
  questions: number;
  accuracy: number | null;
};
export type AccountStatistics = { duel: ModeStatistics; solo: ModeStatistics };

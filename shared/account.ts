import type { Credentials, RoomView } from "./protocol";

export type AccountProfile = {
  id: string;
  username: string;
  name: string;
  photo: string | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
  totalXp: number;
};
export type AuthResult = {
  credentials: Credentials;
  profile: AccountProfile;
  recoveryCode?: string;
};
export type Friend = {
  id: string;
  username: string;
  name: string;
  online: boolean;
};
export type FriendRequest = { id: string; player: Friend };
export type Invitation = {
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
  id: string;
  finishedAt: number;
  mode: "duel" | "solo";
  players: RoomView["players"];
  winnerId: string | null;
  reason: RoomView["reason"];
  rounds: number;
};
export type HistoryPage = { matches: MatchSummary[]; next: number | null };

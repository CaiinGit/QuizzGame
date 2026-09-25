export type Phase =
  "lobby" | "countdown" | "question" | "reveal" | "finished" | "cancelled";
export type PublicPlayer = {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  online: boolean;
  answered: boolean;
};
export type RoomView = {
  code: string;
  phase: Phase;
  revision: number;
  serverNow: number;
  deadline: number;
  round: number;
  total: number;
  hostId: string;
  players: PublicPlayer[];
  question: { text: string; choices: string[] } | null;
  selected: number | null;
  submitted: boolean;
  correction: {
    correct: number;
    explanation: string;
    answers: Record<string, { choice: number | null; points: number }>;
  } | null;
  winnerId: string | null;
  reason: "completed" | "forfeit" | "expired" | null;
};
export type Ack<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };
export type Credentials = { id: string; token: string; name: string };

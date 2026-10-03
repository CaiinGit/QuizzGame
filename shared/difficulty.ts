export const difficultyChoices = [
  "all",
  "easy",
  "medium",
  "hard",
  "very_hard",
  "expert",
] as const;
export type DifficultyChoice = (typeof difficultyChoices)[number];
export const difficultyLabels: Record<DifficultyChoice, string> = {
  all: "Toutes",
  easy: "Facile",
  medium: "Intermédiaire",
  hard: "Difficile",
  very_hard: "Très difficile",
  expert: "Professionnel",
};
export type DifficultyAvailability = {
  difficulty: DifficultyChoice;
  count: number;
  available: boolean;
}[];

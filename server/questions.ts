// Banque privée au serveur : jamais importée dans le client.
export type Question = {
  id: string;
  text: string;
  choices: string[];
  correct: number;
  explanation: string;
};
export const questions: Question[] = [
  {
    id: "one-piece-1",
    text: "Qui rêve de devenir le roi des pirates ?",
    choices: ["Monkey D. Luffy", "Roronoa Zoro", "Sanji", "Koby"],
    correct: 0,
    explanation:
      "Luffy prend la mer pour trouver le One Piece et devenir le roi des pirates.",
  },
  {
    id: "one-piece-2",
    text: "Qui a confié son chapeau de paille à Luffy ?",
    choices: ["Shanks", "Mihawk", "Garp", "Baggy"],
    correct: 0,
    explanation:
      "Shanks confie son chapeau à Luffy et lui demande de le lui rendre lorsqu’il sera devenu un grand pirate.",
  },
  {
    id: "one-piece-3",
    text: "Quel membre de l’équipage utilise trois sabres ?",
    choices: ["Zoro", "Usopp", "Chopper", "Franky"],
    correct: 0,
    explanation:
      "Zoro pratique le Santoryu, un style de combat à trois sabres.",
  },
  {
    id: "one-piece-4",
    text: "Quel est le métier de Nami à bord ?",
    choices: ["Navigatrice", "Médecin", "Cuisinière", "Archéologue"],
    correct: 0,
    explanation:
      "Nami guide l’équipage grâce à ses connaissances en navigation et en météorologie.",
  },
  {
    id: "one-piece-5",
    text: "Qui est le cuisinier de l’équipage ?",
    choices: ["Sanji", "Brook", "Franky", "Jinbe"],
    correct: 0,
    explanation:
      "Sanji a appris la cuisine au Baratie, notamment auprès de Zeff.",
  },
  {
    id: "one-piece-6",
    text: "Quel animal est Tony Tony Chopper ?",
    choices: ["Un renne", "Un ours", "Un cerf-volant", "Un lapin"],
    correct: 0,
    explanation: "Chopper est un renne qui a mangé le fruit de l’humain.",
  },
  {
    id: "one-piece-7",
    text: "Quel est le premier navire principal de l’équipage ?",
    choices: ["Going Merry", "Thousand Sunny", "Moby Dick", "Oro Jackson"],
    correct: 0,
    explanation:
      "Le Going Merry précède le Thousand Sunny dans les aventures de l’équipage.",
  },
  {
    id: "one-piece-8",
    text: "Qui est l’archéologue de l’équipage ?",
    choices: ["Nico Robin", "Nami", "Vivi", "Perona"],
    correct: 0,
    explanation:
      "Nico Robin recherche la véritable histoire et sait lire les ponéglyphes.",
  },
  {
    id: "one-piece-9",
    text: "Qui a créé le manga One Piece ?",
    choices: [
      "Eiichiro Oda",
      "Akira Toriyama",
      "Masashi Kishimoto",
      "Tite Kubo",
    ],
    correct: 0,
    explanation: "Eiichiro Oda est l’auteur et le dessinateur de One Piece.",
  },
  {
    id: "one-piece-10",
    text: "Quel musicien de l’équipage est un squelette ?",
    choices: ["Brook", "Franky", "Usopp", "Jinbe"],
    correct: 0,
    explanation: "Brook est le musicien de l’équipage du Chapeau de paille.",
  },
];

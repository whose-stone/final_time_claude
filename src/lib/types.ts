export type Character = "boy" | "girl";

export type LevelId = 1 | 2 | 3 | 4 | 5;

export const LEVEL_NAMES: Record<LevelId, string> = {
  1: "Beach",
  2: "Desert",
  3: "Forest",
  4: "Arctic",
  5: "Castle",
};

export interface Question {
  id: string;
  level: LevelId;
  type: "multiple_choice" | "text";
  prompt: string;
  choices?: string[]; // for multiple_choice, 4 items
  answer: string; // correct answer (for MC this is one of choices; for text this is the accepted answer)
  points: number;
}

export interface LevelConfig {
  level: LevelId;
  triviaBibleCount: number; // number of floating Bibles (power-ups)
  gargoyleCount: number;
  questionCount: number; // number of pen+paper questions
  pointsPerQuestion: number;
}

export interface GameConfig {
  limitedLives: boolean;
  startingLives: number;
  defaultPointsPerQuestion: number;
  levels: Record<LevelId, LevelConfig>;
}

export const DEFAULT_CONFIG: GameConfig = {
  limitedLives: true,
  startingLives: 3,
  defaultPointsPerQuestion: 20,
  levels: {
    1: { level: 1, triviaBibleCount: 3, gargoyleCount: 5, questionCount: 5, pointsPerQuestion: 20 },
    2: { level: 2, triviaBibleCount: 3, gargoyleCount: 6, questionCount: 5, pointsPerQuestion: 20 },
    3: { level: 3, triviaBibleCount: 4, gargoyleCount: 7, questionCount: 5, pointsPerQuestion: 20 },
    4: { level: 4, triviaBibleCount: 4, gargoyleCount: 8, questionCount: 5, pointsPerQuestion: 20 },
    5: { level: 5, triviaBibleCount: 5, gargoyleCount: 10, questionCount: 5, pointsPerQuestion: 25 },
  },
};

export interface LevelResult {
  level: LevelId;
  score: number;
  correct: number;
  incorrect: number;
  gargoylesDefeated: number;
  timeSeconds: number;
  completedAt: number; // ms epoch
}

export interface PlayerState {
  uid: string;
  email: string;
  displayName?: string;
  character?: Character;
  isAdmin?: boolean;
  totalScore: number;
  lives: number;
  currentLevel: LevelId;
  checkpointQuestionIndex: number; // last question answered per level
  checkpointLevel: LevelId;
  levelResults: LevelResult[];
  createdAt: number;
  updatedAt: number;
}

export function letterGrade(percent: number): "A" | "B" | "C" | "D" | "F" {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "F";
}

// Default seed questions used if Firestore has none for a level.
export const DEFAULT_QUESTIONS: Question[] = [
  // Beach (Level 1) - Creation / early Genesis
  { id: "seed-1-1", level: 1, type: "multiple_choice", prompt: "Who created the world?", choices: ["God", "Moses", "David", "Noah"], answer: "God", points: 20 },
  { id: "seed-1-2", level: 1, type: "multiple_choice", prompt: "How many days did it take God to create the world?", choices: ["3", "5", "6", "10"], answer: "6", points: 20 },
  { id: "seed-1-3", level: 1, type: "multiple_choice", prompt: "Who were the first man and woman?", choices: ["Cain and Abel", "Adam and Eve", "Abraham and Sarah", "Isaac and Rebekah"], answer: "Adam and Eve", points: 20 },
  { id: "seed-1-4", level: 1, type: "multiple_choice", prompt: "What did God create on the first day?", choices: ["Animals", "Stars", "Light", "Plants"], answer: "Light", points: 20 },
  { id: "seed-1-5", level: 1, type: "multiple_choice", prompt: "On which day did God rest?", choices: ["1st", "3rd", "6th", "7th"], answer: "7th", points: 20 },

  // Desert (Level 2) - Exodus / Moses
  { id: "seed-2-1", level: 2, type: "multiple_choice", prompt: "Who led the Israelites out of Egypt?", choices: ["Moses", "Joshua", "Aaron", "Samuel"], answer: "Moses", points: 20 },
  { id: "seed-2-2", level: 2, type: "multiple_choice", prompt: "How many commandments did God give Moses?", choices: ["5", "7", "10", "12"], answer: "10", points: 20 },
  { id: "seed-2-3", level: 2, type: "multiple_choice", prompt: "What sea did Moses part?", choices: ["Dead Sea", "Red Sea", "Sea of Galilee", "Mediterranean"], answer: "Red Sea", points: 20 },
  { id: "seed-2-4", level: 2, type: "multiple_choice", prompt: "What food fell from heaven in the desert?", choices: ["Bread", "Manna", "Rice", "Fish"], answer: "Manna", points: 20 },
  { id: "seed-2-5", level: 2, type: "multiple_choice", prompt: "Where did God appear to Moses?", choices: ["Burning bush", "Cloud", "River", "Cave"], answer: "Burning bush", points: 20 },

  // Forest (Level 3) - Noah / Garden
  { id: "seed-3-1", level: 3, type: "multiple_choice", prompt: "Who built the ark?", choices: ["Noah", "Abraham", "Jonah", "Paul"], answer: "Noah", points: 20 },
  { id: "seed-3-2", level: 3, type: "multiple_choice", prompt: "How many of each animal went on the ark?", choices: ["One", "Two", "Three", "Four"], answer: "Two", points: 20 },
  { id: "seed-3-3", level: 3, type: "multiple_choice", prompt: "How many days did it rain?", choices: ["7", "20", "40", "100"], answer: "40", points: 20 },
  { id: "seed-3-4", level: 3, type: "multiple_choice", prompt: "What sign did God give after the flood?", choices: ["Star", "Rainbow", "Dove", "Cloud"], answer: "Rainbow", points: 20 },
  { id: "seed-3-5", level: 3, type: "multiple_choice", prompt: "What was the garden called where Adam lived?", choices: ["Garden of Eden", "Garden of Olives", "Garden of Gethsemane", "Garden of Paradise"], answer: "Garden of Eden", points: 20 },

  // Arctic (Level 4) - David, Daniel, Jonah
  { id: "seed-4-1", level: 4, type: "multiple_choice", prompt: "Who killed the giant Goliath?", choices: ["Saul", "David", "Samson", "Gideon"], answer: "David", points: 20 },
  { id: "seed-4-2", level: 4, type: "multiple_choice", prompt: "Who was thrown into the lions' den?", choices: ["Daniel", "Jonah", "Joseph", "Peter"], answer: "Daniel", points: 20 },
  { id: "seed-4-3", level: 4, type: "multiple_choice", prompt: "Who was swallowed by a big fish?", choices: ["Peter", "Paul", "Jonah", "John"], answer: "Jonah", points: 20 },
  { id: "seed-4-4", level: 4, type: "multiple_choice", prompt: "Who had a coat of many colors?", choices: ["Joseph", "Jacob", "Isaac", "Samuel"], answer: "Joseph", points: 20 },
  { id: "seed-4-5", level: 4, type: "multiple_choice", prompt: "Who was the strongest man in the Bible?", choices: ["Samson", "Saul", "Solomon", "Stephen"], answer: "Samson", points: 20 },

  // Castle (Level 5) - Jesus / New Testament
  { id: "seed-5-1", level: 5, type: "multiple_choice", prompt: "In what town was Jesus born?", choices: ["Nazareth", "Bethlehem", "Jerusalem", "Jericho"], answer: "Bethlehem", points: 25 },
  { id: "seed-5-2", level: 5, type: "multiple_choice", prompt: "Who was Jesus' mother?", choices: ["Martha", "Mary", "Ruth", "Esther"], answer: "Mary", points: 25 },
  { id: "seed-5-3", level: 5, type: "multiple_choice", prompt: "How many disciples did Jesus have?", choices: ["7", "10", "12", "15"], answer: "12", points: 25 },
  { id: "seed-5-4", level: 5, type: "multiple_choice", prompt: "What did Jesus do on the third day?", choices: ["Healed a leper", "Rose from the dead", "Fed the 5000", "Walked on water"], answer: "Rose from the dead", points: 25 },
  { id: "seed-5-5", level: 5, type: "multiple_choice", prompt: "What is the first book of the New Testament?", choices: ["Mark", "Luke", "Matthew", "John"], answer: "Matthew", points: 25 },
];

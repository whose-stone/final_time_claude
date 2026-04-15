export type Character = "boy" | "girl";

export type LevelId = 1 | 2 | 3 | 4 | 5;

export const LEVEL_NAMES: Record<LevelId, string> = {
  1: "Beach",
  2: "Desert",
  3: "Forest",
  4: "Arctic",
  5: "Castle",
};

// Rough academic grade level that each stage's Bible trivia is written for.
// Used as guidance for admins, not enforced by code.
export const LEVEL_DIFFICULTY: Record<LevelId, string> = {
  1: "1st grade",
  2: "2nd grade",
  3: "3rd grade",
  4: "4th grade",
  5: "5th grade",
};

export type QuestionCategory = "bible" | "test";

export interface Question {
  id: string;
  level: LevelId;
  // `category` distinguishes floating-Bible power-up trivia ("bible") from
  // the pen+paper graded level questions ("test"). Older records written
  // before this field existed are treated as "bible".
  category?: QuestionCategory;
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

// ---------------------------------------------------------------------------
// Default Bible trivia (power-up pickups).
// Unique across all levels. Difficulty scales from 1st-grade (Beach) up to
// 5th-grade (Castle). Progression: Creation -> Exodus -> Patriarchs/Flood
// -> Judges & Kings -> Jesus & New Testament.
// ---------------------------------------------------------------------------
const BIBLE_QUESTIONS: Question[] = [
  // Level 1 — Beach · 1st grade · Creation & the Garden
  { id: "bible-1-1", level: 1, category: "bible", type: "multiple_choice", prompt: "Who created the heavens and the earth?", choices: ["God", "A king", "A wizard", "Nobody"], answer: "God", points: 20 },
  { id: "bible-1-2", level: 1, category: "bible", type: "multiple_choice", prompt: "What did God make on the very first day?", choices: ["The sun", "Light", "Fish", "People"], answer: "Light", points: 20 },
  { id: "bible-1-3", level: 1, category: "bible", type: "multiple_choice", prompt: "What was the name of the first man?", choices: ["Noah", "Adam", "Moses", "David"], answer: "Adam", points: 20 },
  { id: "bible-1-4", level: 1, category: "bible", type: "multiple_choice", prompt: "Where did God place the first people to live?", choices: ["A boat", "A cave", "The Garden of Eden", "A castle"], answer: "The Garden of Eden", points: 20 },
  { id: "bible-1-5", level: 1, category: "bible", type: "multiple_choice", prompt: "On which day did God rest from creating?", choices: ["The 1st", "The 3rd", "The 5th", "The 7th"], answer: "The 7th", points: 20 },

  // Level 2 — Desert · 2nd grade · Moses & Exodus
  { id: "bible-2-1", level: 2, category: "bible", type: "multiple_choice", prompt: "Who led God's people out of Egypt?", choices: ["Joshua", "Moses", "Samuel", "Aaron"], answer: "Moses", points: 20 },
  { id: "bible-2-2", level: 2, category: "bible", type: "multiple_choice", prompt: "What did God give Moses on Mount Sinai?", choices: ["A golden crown", "A sword", "The Ten Commandments", "A flag"], answer: "The Ten Commandments", points: 20 },
  { id: "bible-2-3", level: 2, category: "bible", type: "multiple_choice", prompt: "What bread-like food fell from heaven in the desert?", choices: ["Pizza", "Manna", "Bagels", "Bread rolls"], answer: "Manna", points: 20 },
  { id: "bible-2-4", level: 2, category: "bible", type: "multiple_choice", prompt: "What did Moses strike to make water come out?", choices: ["A tree", "A cloud", "A rock", "The ground"], answer: "A rock", points: 20 },
  { id: "bible-2-5", level: 2, category: "bible", type: "multiple_choice", prompt: "Which sea did God split for the Israelites?", choices: ["Dead Sea", "Red Sea", "Sea of Galilee", "Mediterranean Sea"], answer: "Red Sea", points: 20 },

  // Level 3 — Forest · 3rd grade · Noah, Abraham, Joseph
  { id: "bible-3-1", level: 3, category: "bible", type: "multiple_choice", prompt: "Who built a giant ark to survive a flood?", choices: ["Abraham", "Noah", "Isaac", "Jacob"], answer: "Noah", points: 20 },
  { id: "bible-3-2", level: 3, category: "bible", type: "multiple_choice", prompt: "How many days and nights did the flood rain?", choices: ["7", "20", "40", "100"], answer: "40", points: 20 },
  { id: "bible-3-3", level: 3, category: "bible", type: "multiple_choice", prompt: "What did God put in the sky as a promise after the flood?", choices: ["A dove", "A rainbow", "A star", "A cloud"], answer: "A rainbow", points: 20 },
  { id: "bible-3-4", level: 3, category: "bible", type: "multiple_choice", prompt: "Whose coat was described as having many colors?", choices: ["Jacob's", "Joseph's", "Esau's", "Reuben's"], answer: "Joseph's", points: 20 },
  { id: "bible-3-5", level: 3, category: "bible", type: "multiple_choice", prompt: "To whom did God promise to make a great nation?", choices: ["Abraham", "Elijah", "John", "Saul"], answer: "Abraham", points: 20 },

  // Level 4 — Arctic · 4th grade · Judges, Kings, Prophets
  { id: "bible-4-1", level: 4, category: "bible", type: "multiple_choice", prompt: "Who defeated the giant Goliath with a sling?", choices: ["Saul", "David", "Jonathan", "Samson"], answer: "David", points: 20 },
  { id: "bible-4-2", level: 4, category: "bible", type: "multiple_choice", prompt: "Which prophet was kept safe in a den of lions?", choices: ["Elijah", "Daniel", "Isaiah", "Jeremiah"], answer: "Daniel", points: 20 },
  { id: "bible-4-3", level: 4, category: "bible", type: "multiple_choice", prompt: "Who was swallowed by a great fish for three days?", choices: ["Peter", "Paul", "Jonah", "John"], answer: "Jonah", points: 20 },
  { id: "bible-4-4", level: 4, category: "bible", type: "multiple_choice", prompt: "Which Israelite king is known for his wisdom?", choices: ["Saul", "David", "Solomon", "Hezekiah"], answer: "Solomon", points: 20 },
  { id: "bible-4-5", level: 4, category: "bible", type: "multiple_choice", prompt: "Whose long hair was the secret to his great strength?", choices: ["Gideon", "Samson", "Elisha", "Barak"], answer: "Samson", points: 20 },

  // Level 5 — Castle · 5th grade · Jesus & the New Testament
  { id: "bible-5-1", level: 5, category: "bible", type: "multiple_choice", prompt: "In what town was Jesus born?", choices: ["Nazareth", "Bethlehem", "Jerusalem", "Capernaum"], answer: "Bethlehem", points: 25 },
  { id: "bible-5-2", level: 5, category: "bible", type: "multiple_choice", prompt: "How many apostles did Jesus choose to follow Him closely?", choices: ["7", "10", "12", "15"], answer: "12", points: 25 },
  { id: "bible-5-3", level: 5, category: "bible", type: "multiple_choice", prompt: "Which disciple denied knowing Jesus three times?", choices: ["John", "Peter", "Thomas", "Andrew"], answer: "Peter", points: 25 },
  { id: "bible-5-4", level: 5, category: "bible", type: "multiple_choice", prompt: "On which day did Jesus rise from the dead?", choices: ["The first day", "The second day", "The third day", "The seventh day"], answer: "The third day", points: 25 },
  { id: "bible-5-5", level: 5, category: "bible", type: "multiple_choice", prompt: "What is the first book of the New Testament?", choices: ["Acts", "Mark", "Matthew", "John"], answer: "Matthew", points: 25 },
];

// ---------------------------------------------------------------------------
// Default graded "test" questions (pen + paper pickups). These are about
// Arizona Christian University history and progress from easy (school
// identity) through location, academics, athletics, and traditions. Admins
// are expected to replace these with their own classroom content.
// ---------------------------------------------------------------------------
const ACU_TEST_QUESTIONS: Question[] = [
  // Level 1 — Identity basics
  { id: "acu-1-1", level: 1, category: "test", type: "multiple_choice", prompt: "What does \"ACU\" stand for?", choices: ["American Christian University", "Arizona Christian University", "Atlanta Christian University", "Arizona Community University"], answer: "Arizona Christian University", points: 20 },
  { id: "acu-1-2", level: 1, category: "test", type: "multiple_choice", prompt: "What is ACU's mascot?", choices: ["Wildcats", "Eagles", "Firebirds", "Lions"], answer: "Firebirds", points: 20 },
  { id: "acu-1-3", level: 1, category: "test", type: "multiple_choice", prompt: "In what U.S. state is ACU located?", choices: ["California", "Arizona", "Nevada", "Texas"], answer: "Arizona", points: 20 },
  { id: "acu-1-4", level: 1, category: "test", type: "multiple_choice", prompt: "ACU is best described as what kind of school?", choices: ["Public state school", "Christian university", "Community college", "Military academy"], answer: "Christian university", points: 20 },
  { id: "acu-1-5", level: 1, category: "test", type: "multiple_choice", prompt: "Which pair best represents ACU's main school colors?", choices: ["Black and White", "Blue and Silver", "Crimson and Gold", "Green and Orange"], answer: "Crimson and Gold", points: 20 },

  // Level 2 — Location & founding
  { id: "acu-2-1", level: 2, category: "test", type: "multiple_choice", prompt: "ACU's main campus is located in which Arizona city?", choices: ["Tucson", "Flagstaff", "Glendale", "Mesa"], answer: "Glendale", points: 20 },
  { id: "acu-2-2", level: 2, category: "test", type: "multiple_choice", prompt: "In which decade was ACU originally founded?", choices: ["1940s", "1960s", "1980s", "2000s"], answer: "1960s", points: 20 },
  { id: "acu-2-3", level: 2, category: "test", type: "multiple_choice", prompt: "Is ACU a private or a public university?", choices: ["Private", "Public", "Federal", "Military"], answer: "Private", points: 20 },
  { id: "acu-2-4", level: 2, category: "test", type: "multiple_choice", prompt: "What religious tradition is ACU rooted in?", choices: ["Buddhist", "Christian", "Jewish", "Secular"], answer: "Christian", points: 20 },
  { id: "acu-2-5", level: 2, category: "test", type: "multiple_choice", prompt: "How many years does a typical ACU undergraduate degree take?", choices: ["2", "3", "4", "6"], answer: "4", points: 20 },

  // Level 3 — Academics & worldview
  { id: "acu-3-1", level: 3, category: "test", type: "multiple_choice", prompt: "Which book is foundational to ACU's curriculum and worldview?", choices: ["The Quran", "The Torah", "The Bible", "The Mahabharata"], answer: "The Bible", points: 20 },
  { id: "acu-3-2", level: 3, category: "test", type: "multiple_choice", prompt: "ACU is generally described as what kind of Christian school?", choices: ["Roman Catholic", "Eastern Orthodox", "Nondenominational Christian", "Secular"], answer: "Nondenominational Christian", points: 20 },
  { id: "acu-3-3", level: 3, category: "test", type: "multiple_choice", prompt: "What kind of worldview does ACU teach from?", choices: ["Marxist", "Biblical", "Postmodern", "Atheist"], answer: "Biblical", points: 20 },
  { id: "acu-3-4", level: 3, category: "test", type: "multiple_choice", prompt: "Which was ACU's original historical name?", choices: ["Southwestern Bible Institute", "Phoenix State College", "Mesa Tech", "Grand Canyon Seminary"], answer: "Southwestern Bible Institute", points: 20 },
  { id: "acu-3-5", level: 3, category: "test", type: "multiple_choice", prompt: "ACU aims to prepare students for Christian _______.", choices: ["Ministry and service", "Warfare", "Politics only", "Business only"], answer: "Ministry and service", points: 20 },

  // Level 4 — Athletics & traditions
  { id: "acu-4-1", level: 4, category: "test", type: "multiple_choice", prompt: "ACU competes in which national athletic association?", choices: ["NCAA Division I", "NCAA Division II", "NAIA", "NJCAA"], answer: "NAIA", points: 20 },
  { id: "acu-4-2", level: 4, category: "test", type: "multiple_choice", prompt: "Which conference is ACU part of?", choices: ["Pac-12", "Big Sky", "Golden State Athletic Conference", "Mountain West"], answer: "Golden State Athletic Conference", points: 20 },
  { id: "acu-4-3", level: 4, category: "test", type: "multiple_choice", prompt: "The Firebird mascot is most similar to which mythical creature?", choices: ["Dragon", "Phoenix", "Unicorn", "Griffin"], answer: "Phoenix", points: 20 },
  { id: "acu-4-4", level: 4, category: "test", type: "multiple_choice", prompt: "In what year did Southwestern College officially rename itself Arizona Christian University?", choices: ["2001", "2011", "2015", "2020"], answer: "2011", points: 20 },
  { id: "acu-4-5", level: 4, category: "test", type: "multiple_choice", prompt: "ACU offers competitive athletics for which groups of students?", choices: ["Men only", "Women only", "Both men and women", "Neither"], answer: "Both men and women", points: 20 },

  // Level 5 — Recent history & identity (hardest)
  { id: "acu-5-1", level: 5, category: "test", type: "multiple_choice", prompt: "In which decade did ACU move to its current Glendale campus?", choices: ["1990s", "2000s", "2010s", "2020s"], answer: "2010s", points: 25 },
  { id: "acu-5-2", level: 5, category: "test", type: "multiple_choice", prompt: "ACU's mission emphasizes shaping students for which kind of leadership?", choices: ["Christian leadership", "Corporate leadership only", "Political leadership only", "Military leadership"], answer: "Christian leadership", points: 25 },
  { id: "acu-5-3", level: 5, category: "test", type: "multiple_choice", prompt: "Who is the central figure of the Christian faith that ACU teaches about?", choices: ["Moses", "Muhammad", "Jesus Christ", "Buddha"], answer: "Jesus Christ", points: 25 },
  { id: "acu-5-4", level: 5, category: "test", type: "multiple_choice", prompt: "ACU is regionally accredited by which accrediting body?", choices: ["Higher Learning Commission (HLC)", "ABET", "WASC", "SACS"], answer: "Higher Learning Commission (HLC)", points: 25 },
  { id: "acu-5-5", level: 5, category: "test", type: "multiple_choice", prompt: "ACU's identity is shaped most by a commitment to what?", choices: ["A biblical worldview", "A political platform", "A scientific method only", "A fine-arts focus"], answer: "A biblical worldview", points: 25 },
];

// Combined default pool used by the admin seeder. When floating Bibles are
// picked up the game filters this by category "bible"; pen + paper pickups
// filter by category "test".
export const DEFAULT_QUESTIONS: Question[] = [
  ...BIBLE_QUESTIONS,
  ...ACU_TEST_QUESTIONS,
];

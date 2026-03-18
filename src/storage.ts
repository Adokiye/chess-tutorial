// Game save/load system using localStorage

export interface SavedGame {
  id: string;
  fen: string;
  pgn: string;
  moveHistory: string[];
  playerColor: 'w' | 'b';
  difficulty: 'easy' | 'medium' | 'hard';
  hintsEnabled: boolean;
  date: string; // ISO string
  result?: string; // undefined = in progress
  moveCount: number;
}

const STORAGE_KEY = 'chess-coach-saved-games';

function getAll(): SavedGame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedGame[];
  } catch {
    return [];
  }
}

function saveAll(games: SavedGame[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export function saveGame(game: SavedGame) {
  const games = getAll();
  const idx = games.findIndex(g => g.id === game.id);
  if (idx >= 0) {
    games[idx] = game;
  } else {
    games.unshift(game);
  }
  saveAll(games);
}

export function loadGames(): SavedGame[] {
  return getAll().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function deleteGame(id: string) {
  const games = getAll().filter(g => g.id !== id);
  saveAll(games);
}

export function generateGameId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================
// ELO RATING & PLAYER STATS
// =============================================

export interface PlayerStats {
  elo: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  totalMoveCount: number;
  eloHistory: { date: string; elo: number }[];
}

const STATS_KEY = 'chess-coach-player-stats';
const DEFAULT_ELO = 1200;
const DIFFICULTY_ELO: Record<string, number> = { easy: 800, medium: 1200, hard: 1600 };

const DEFAULT_STATS: PlayerStats = {
  elo: DEFAULT_ELO,
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalMoveCount: 0,
  eloHistory: [{ date: new Date().toISOString(), elo: DEFAULT_ELO }],
};

export function getPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    return JSON.parse(raw) as PlayerStats;
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function savePlayerStats(stats: PlayerStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function calculateExpected(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

function calculateEloChange(playerElo: number, opponentElo: number, result: number): number {
  const K = 32;
  const expected = calculateExpected(playerElo, opponentElo);
  return Math.round(K * (result - expected));
}

export function updateStatsAfterGame(
  resultType: 'win' | 'loss' | 'draw',
  difficulty: 'easy' | 'medium' | 'hard',
  moveCount: number
): { stats: PlayerStats; eloChange: number } {
  const stats = getPlayerStats();
  const opponentElo = DIFFICULTY_ELO[difficulty];
  const result = resultType === 'win' ? 1 : resultType === 'draw' ? 0.5 : 0;
  const eloChange = calculateEloChange(stats.elo, opponentElo, result);

  stats.elo = Math.max(100, stats.elo + eloChange); // floor at 100
  stats.totalGames++;
  stats.totalMoveCount += moveCount;

  if (resultType === 'win') {
    stats.wins++;
    stats.currentStreak = Math.max(0, stats.currentStreak) + 1;
  } else if (resultType === 'loss') {
    stats.losses++;
    stats.currentStreak = Math.min(0, stats.currentStreak) - 1;
  } else {
    stats.draws++;
    stats.currentStreak = 0;
  }

  stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);

  // Keep last 50 ELO history entries
  stats.eloHistory.push({ date: new Date().toISOString(), elo: stats.elo });
  if (stats.eloHistory.length > 50) stats.eloHistory = stats.eloHistory.slice(-50);

  savePlayerStats(stats);
  return { stats, eloChange };
}

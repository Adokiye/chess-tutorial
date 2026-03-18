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

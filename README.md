# Chess Tutor

An interactive chess learning and practice web app built with **React + TypeScript + Vite**.
Play against an in-browser engine, learn through structured lessons, study famous games, and solve tactical puzzles—all in one place.

## ✨ Features

- **Play vs AI** with multiple difficulty levels (`beginner` → `master`).
- **Hint system** with move suggestions and analysis support.
- **Post-game analysis** to review moves and key decisions.
- **Learning mode** with:
  - Curated chess lessons
  - Recommended chess books
  - Famous game replays
  - Interactive puzzles
- **Game persistence**: save/load games and track your progress.
- **Player stats & Elo-style updates** after game results.
- **Optional clocks** for timed games.
- **Sound effects** for move, capture, check, castling, and game-over events.

## 🧱 Tech Stack

- **Frontend:** React 19, TypeScript
- **Build Tool:** Vite
- **Chess Logic:** `chess.js`
- **Linting:** ESLint

## 🚀 Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Start development server

```bash
npm run dev
```

Then open the local URL shown in your terminal (usually `http://localhost:5173`).

## 📦 Available Scripts

- `npm run dev` — Start local development server
- `npm run build` — Type-check and build production bundle
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint checks

## 🎮 How to Use

1. Launch the app and choose your side, difficulty, and optional time control.
2. Play moves directly on the board (promotion and special rules are supported).
3. Toggle hints when needed.
4. Use analysis/game-over views to review performance.
5. Visit **Learn** mode for lessons, puzzles, and famous games.

## 📁 Project Structure

```text
src/
  App.tsx              # Main gameplay UI and state management
  Learn.tsx            # Learning hub: lessons, books, games, puzzles
  engine.ts            # Move selection, hints, and analysis logic
  engineWorker.ts      # Worker-side engine computations
  useEngineWorker.ts   # Hook interface for worker communication
  tutorialData.ts      # Lessons, books, famous games, puzzle content
  storage.ts           # Save/load game and player stats utilities
  sounds.ts            # Audio playback helpers
```

## 📝 Notes

- All gameplay runs locally in the browser.
- No backend is required for core usage.
- Saved progress is stored client-side.

---

If you enjoy this project, consider extending it with opening trainers, custom puzzle imports, or multiplayer support.

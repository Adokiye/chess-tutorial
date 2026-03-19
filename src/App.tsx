import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, type Square } from 'chess.js';
import {
  getEnhancedHint,
  getValidMoves,
  analyzeGame,
  evaluateBoard,
  type MoveAnalysis,
  type EnhancedHint,
} from './engine';
import { useEngineWorker } from './useEngineWorker';
import { ChessPiece } from './pieces';
import { playMoveSound, playCaptureSound, playCheckSound, playCastleSound, playGameOverSound, unlockAudio } from './sounds';
import {
  saveGame,
  loadGames,
  deleteGame,
  generateGameId,
  formatDate,
  formatFullDate,
  getPlayerStats,
  updateStatsAfterGame,
  type SavedGame,
  type PlayerStats,
} from './storage';
import Learn from './Learn';
import './App.css';

type GamePhase = 'menu' | 'playing' | 'gameover' | 'analysis' | 'learn';
type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' | 'master';
type PlayerColor = 'w' | 'b';
type TimeControl = 0 | 60 | 180 | 300 | 600 | 900; // 0 = unlimited, seconds

const TIME_LABELS: Record<TimeControl, string> = {
  0: 'Unlimited',
  60: '1 min',
  180: '3 min',
  300: '5 min',
  600: '10 min',
  900: '15 min',
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function App() {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [currentHint, setCurrentHint] = useState<EnhancedHint | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [analysisData, setAnalysisData] = useState<MoveAnalysis[]>([]);
  const [analysisIndex, setAnalysisIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [gameResult, setGameResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [flipBoard, setFlipBoard] = useState(false);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(getPlayerStats());
  const [lastEloChange, setLastEloChange] = useState<number | null>(null);
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);
  const [confirmingResign, setConfirmingResign] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [premove, setPremove] = useState<{ from: Square; to: Square; promotion?: string } | null>(null);
  // Clock state
  const [timeControl, setTimeControl] = useState<TimeControl>(0);
  const [playerTime, setPlayerTime] = useState(0);
  const [opponentTime, setOpponentTime] = useState(0);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveListRef = useRef<HTMLDivElement>(null);

  const { computeMove } = useEngineWorker();

  const depthMap: Record<Difficulty, number> = { beginner: 1, easy: 2, medium: 3, hard: 4, expert: 5, master: 6 };

  // Hash-based routing: sync phase to URL
  useEffect(() => {
    const hashMap: Record<GamePhase, string> = {
      menu: '#/',
      playing: '#/play',
      gameover: '#/gameover',
      analysis: '#/analysis',
      learn: '#/learn',
    };
    const currentHash = hashMap[phase] || '#/';
    if (window.location.hash !== currentHash) {
      window.history.pushState(null, '', currentHash);
    }
  }, [phase]);

  // Listen for browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/' || hash === '' || hash === '#') {
        if (phase !== 'menu' && phase !== 'playing') setPhase('menu');
      } else if (hash === '#/learn') {
        setPhase('learn');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    // On mount, check if we should start on learn
    const hash = window.location.hash;
    if (hash === '#/learn') setPhase('learn');
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [phase]);

  // Play appropriate sound for a chess move
  const playSound = useCallback((san: string, captured: boolean, isCastle: boolean) => {
    if (!soundEnabled) return;
    if (san.includes('#') || san.includes('+')) {
      playCheckSound();
    } else if (isCastle) {
      playCastleSound();
    } else if (captured) {
      playCaptureSound();
    } else {
      playMoveSound();
    }
  }, [soundEnabled]);

  // Build the board to display: either the live game or a historical position
  const displayGame = (() => {
    if (viewingMoveIndex === null) return game;
    const replay = new Chess();
    for (let i = 0; i < moveHistory.length && i <= viewingMoveIndex; i++) {
      replay.move(moveHistory[i]);
    }
    return replay;
  })();

  const isViewingHistory = viewingMoveIndex !== null;

  // Compute captured pieces
  const getCaptured = (g: Chess) => {
    const starting: Record<string, number> = { wp: 8, wn: 2, wb: 2, wr: 2, wq: 1, bp: 8, bn: 2, bb: 2, br: 2, bq: 1 };
    const current: Record<string, number> = {};
    for (const row of g.board()) {
      for (const piece of row) {
        if (piece) {
          const key = `${piece.color}${piece.type}`;
          current[key] = (current[key] || 0) + 1;
        }
      }
    }
    const captured: { color: string; type: string }[] = [];
    for (const [key, count] of Object.entries(starting)) {
      const diff = count - (current[key] || 0);
      for (let i = 0; i < diff; i++) {
        captured.push({ color: key[0], type: key.slice(1) });
      }
    }
    return captured;
  };
  const allCaptured = getCaptured(displayGame);
  const whiteCaptured = allCaptured.filter(p => p.color === 'w');
  const blackCaptured = allCaptured.filter(p => p.color === 'b');
  const pieceVals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const whiteMat = whiteCaptured.reduce((s, p) => s + (pieceVals[p.type] || 0), 0);
  const blackMat = blackCaptured.reduce((s, p) => s + (pieceVals[p.type] || 0), 0);
  const materialAdvantage = blackMat - whiteMat;

  // Load saved games on mount
  useEffect(() => {
    setSavedGames(loadGames());
  }, []);

  // Clock tick
  useEffect(() => {
    if (phase !== 'playing' || timeControl === 0 || game.isGameOver()) {
      if (clockRef.current) clearInterval(clockRef.current);
      return;
    }
    clockRef.current = setInterval(() => {
      const isPlayerTurn = game.turn() === playerColor;
      if (isPlayerTurn) {
        setPlayerTime(prev => {
          if (prev <= 1) {
            // Player ran out of time
            clearInterval(clockRef.current!);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setOpponentTime(prev => {
          if (prev <= 1) {
            clearInterval(clockRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [phase, timeControl, game, playerColor]);

  // Handle time-out
  useEffect(() => {
    if (phase !== 'playing' || timeControl === 0) return;
    if (playerTime === 0 && moveHistory.length > 0) {
      setGameResult('You lost on time.');
      if (soundEnabled) playGameOverSound(false);
      const { stats, eloChange } = updateStatsAfterGame('loss', difficulty, moveHistory.length);
      setPlayerStats(stats);
      setLastEloChange(eloChange);
      setPhase('gameover');
    } else if (opponentTime === 0 && moveHistory.length > 0) {
      setGameResult('You won on time!');
      if (soundEnabled) playGameOverSound(true);
      const { stats, eloChange } = updateStatsAfterGame('win', difficulty, moveHistory.length);
      setPlayerStats(stats);
      setLastEloChange(eloChange);
      setPhase('gameover');
    }
  }, [playerTime, opponentTime, phase, timeControl, moveHistory.length, soundEnabled, difficulty]);

  // Auto-save game after each move
  useEffect(() => {
    if (phase === 'playing' && currentGameId && moveHistory.length > 0) {
      const saved: SavedGame = {
        id: currentGameId,
        fen: game.fen(),
        pgn: game.pgn(),
        moveHistory: [...moveHistory],
        playerColor,
        difficulty,
        hintsEnabled,
        date: new Date().toISOString(),
        moveCount: moveHistory.length,
      };
      saveGame(saved);
      setSavedGames(loadGames());
    }
  }, [game, moveHistory, phase, currentGameId, playerColor, difficulty, hintsEnabled]);

  // Auto-scroll move list
  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Update hint when it's the player's turn
  useEffect(() => {
    if (phase === 'playing' && hintsEnabled && game.turn() === playerColor && !game.isGameOver()) {
      const hint = getEnhancedHint(game, playerColor);
      setCurrentHint(hint);
    } else {
      setCurrentHint(null);
      setShowHint(false);
    }
  }, [game, phase, hintsEnabled, playerColor]);

  // Make AI move (runs in Web Worker — non-blocking)
  const makeAiMove = useCallback(() => {
    if (game.isGameOver()) return;

    setIsThinking(true);
    const depth = depthMap[difficulty];

    computeMove(game.fen(), depth).then((result) => {
      if (result) {
        const newGame = new Chess(game.fen());
        const m = newGame.move(result.move);
        if (m) {
          setLastMove({ from: m.from as Square, to: m.to as Square });
          setMoveHistory(prev => [...prev, m.san]);
          setGame(newGame);
          playSound(m.san, !!m.captured, m.flags.includes('k') || m.flags.includes('q'));

          // Execute queued pre-move
          setPremove(prev => {
            if (prev && !newGame.isGameOver()) {
              setTimeout(() => {
                try {
                  const preGame = new Chess(newGame.fen());
                  const move = preGame.move({ from: prev.from, to: prev.to, promotion: prev.promotion || undefined });
                  if (move) {
                    setLastMove({ from: prev.from, to: prev.to });
                    setMoveHistory(h => [...h, move.san]);
                    setGame(preGame);
                    playSound(move.san, !!move.captured, move.flags.includes('k') || move.flags.includes('q'));
                  }
                } catch {
                  // Pre-move invalid — discard
                }
              }, 50);
            }
            return null;
          });
        }
      }
      setIsThinking(false);
    });
  }, [game, difficulty, playSound, computeMove]);

  // Check for game over
  useEffect(() => {
    if (phase !== 'playing') return;
    if (!game.isGameOver()) {
      if (game.turn() !== playerColor && !isThinking) {
        makeAiMove();
      }
      return;
    }

    let result = '';
    if (game.isCheckmate()) {
      result = game.turn() === playerColor ? 'You lost by checkmate.' : 'You won by checkmate!';
    } else if (game.isStalemate()) {
      result = 'Draw by stalemate.';
    } else if (game.isThreefoldRepetition()) {
      result = 'Draw by threefold repetition.';
    } else if (game.isInsufficientMaterial()) {
      result = 'Draw by insufficient material.';
    } else if (game.isDraw()) {
      result = 'Draw by 50-move rule.';
    }

    // Save completed game
    if (currentGameId) {
      const saved: SavedGame = {
        id: currentGameId,
        fen: game.fen(),
        pgn: game.pgn(),
        moveHistory: [...moveHistory],
        playerColor,
        difficulty,
        hintsEnabled,
        date: new Date().toISOString(),
        result,
        moveCount: moveHistory.length,
      };
      saveGame(saved);
      setSavedGames(loadGames());
    }

    // Update ELO
    let resultType: 'win' | 'loss' | 'draw' = 'draw';
    if (result.includes('won')) resultType = 'win';
    else if (result.includes('lost') || result.includes('resigned')) resultType = 'loss';
    const { stats, eloChange } = updateStatsAfterGame(resultType, difficulty, moveHistory.length);
    setPlayerStats(stats);
    setLastEloChange(eloChange);

    if (soundEnabled) playGameOverSound(resultType === 'win');
    setGameResult(result);
    setPhase('gameover');
  }, [game, phase, playerColor, isThinking, makeAiMove, soundEnabled]);

  const startGame = () => {
    unlockAudio(); // Unlock AudioContext on mobile (requires user gesture)
    const newGame = new Chess();
    const id = generateGameId();
    setGame(newGame);
    setCurrentGameId(id);
    setSelectedSquare(null);
    setValidMoves([]);
    setMoveHistory([]);
    setLastMove(null);
    setViewingMoveIndex(null);
    setCurrentHint(null);
    setShowHint(false);
    setGameResult('');
    setAnalysisData([]);
    setFlipBoard(playerColor === 'b');
    setPremove(null);
    setConfirmingResign(false);
    // Initialize clocks
    if (timeControl > 0) {
      setPlayerTime(timeControl);
      setOpponentTime(timeControl);
    }
    setPhase('playing');
  };

  const resumeGame = (saved: SavedGame) => {
    const newGame = new Chess();
    newGame.loadPgn(saved.pgn);
    setGame(newGame);
    setCurrentGameId(saved.id);
    setPlayerColor(saved.playerColor);
    setDifficulty(saved.difficulty);
    setHintsEnabled(saved.hintsEnabled);
    setMoveHistory(saved.moveHistory);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setViewingMoveIndex(null);
    setCurrentHint(null);
    setShowHint(false);
    setGameResult('');
    setAnalysisData([]);
    setFlipBoard(saved.playerColor === 'b');
    setPhase('playing');
  };

  const handleDeleteGame = (id: string) => {
    deleteGame(id);
    setSavedGames(loadGames());
  };

  const handleSquareClick = (square: Square) => {
    if (isViewingHistory) {
      setViewingMoveIndex(null); // snap back to live game
      return;
    }
    if (phase !== 'playing') return;

    // Pre-move: allow selecting and setting a move while AI is thinking
    if (isThinking || game.turn() !== playerColor) {
      const piece = game.get(square);
      if (piece && piece.color === playerColor) {
        setSelectedSquare(square);
        // Show theoretical valid moves for pre-move visualization
        setValidMoves(getValidMoves(game, square));
        return;
      }
      if (selectedSquare) {
        // Set the pre-move
        setPremove({ from: selectedSquare, to: square });
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
      return;
    }

    const piece = game.get(square);

    if (piece && piece.color === playerColor) {
      setSelectedSquare(square);
      setValidMoves(getValidMoves(game, square));
      return;
    }

    if (selectedSquare) {
      if (validMoves.includes(square)) {
        const piece = game.get(selectedSquare);
        if (piece && piece.type === 'p') {
          const targetRank = square[1];
          if ((piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1')) {
            setPromotionPending({ from: selectedSquare, to: square });
            return;
          }
        }
        makePlayerMove(selectedSquare, square);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  const makePlayerMove = (from: Square, to: Square, promotion?: string) => {
    const newGame = new Chess(game.fen());
    try {
      const move = newGame.move({ from, to, promotion: promotion || undefined });
      if (move) {
        setLastMove({ from, to });
        setMoveHistory(prev => [...prev, move.san]);
        setGame(newGame);
        playSound(move.san, !!move.captured, move.flags.includes('k') || move.flags.includes('q'));
      }
    } catch {
      // Invalid move
    }
    setSelectedSquare(null);
    setValidMoves([]);
    setPromotionPending(null);
  };

  const handlePromotion = (piece: string) => {
    if (promotionPending) {
      makePlayerMove(promotionPending.from, promotionPending.to, piece);
    }
  };

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    const pgn = game.pgn();
    analyzeGame(pgn, (pct) => setAnalysisProgress(pct)).then(data => {
      setAnalysisData(data);
      setAnalysisIndex(0);
      setIsAnalyzing(false);
      setPhase('analysis');
    });
  };

  const resign = () => {
    if (!confirmingResign) {
      setConfirmingResign(true);
      setTimeout(() => setConfirmingResign(false), 5000); // auto-dismiss
      return;
    }
    setConfirmingResign(false);
    const result = 'You resigned.';
    if (currentGameId) {
      const saved: SavedGame = {
        id: currentGameId,
        fen: game.fen(),
        pgn: game.pgn(),
        moveHistory: [...moveHistory],
        playerColor,
        difficulty,
        hintsEnabled,
        date: new Date().toISOString(),
        result,
        moveCount: moveHistory.length,
      };
      saveGame(saved);
      setSavedGames(loadGames());
    }
    const { stats, eloChange } = updateStatsAfterGame('loss', difficulty, moveHistory.length);
    setPlayerStats(stats);
    setLastEloChange(eloChange);
    if (soundEnabled) playGameOverSound(false);
    setGameResult(result);
    setPhase('gameover');
  };

  // Undo last move pair (player move + AI response)
  const undoMove = () => {
    if (isThinking || moveHistory.length < 2 || isViewingHistory || phase !== 'playing') return;
    const newHistory = moveHistory.slice(0, -2);
    const newGame = new Chess();
    for (const san of newHistory) newGame.move(san);
    setGame(newGame);
    setMoveHistory(newHistory);
    setLastMove(null);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === 'playing') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setViewingMoveIndex(prev => {
            if (prev === null) return moveHistory.length > 0 ? moveHistory.length - 2 : null;
            return prev > 0 ? prev - 1 : 0;
          });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setViewingMoveIndex(prev => {
            if (prev === null) return null;
            if (prev >= moveHistory.length - 1) return null;
            return prev + 1;
          });
        } else if (e.key === 'Escape') {
          setViewingMoveIndex(null);
          setConfirmingResign(false);
        }
      } else if (phase === 'analysis') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setAnalysisIndex(prev => Math.max(0, prev - 1));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setAnalysisIndex(prev => Math.min(analysisData.length - 1, prev + 1));
        } else if (e.key === 'Home') {
          e.preventDefault();
          setAnalysisIndex(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          setAnalysisIndex(analysisData.length - 1);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [phase, moveHistory.length, analysisData.length]);

  const renderPiece = (color: string, type: string) => (
    <ChessPiece color={color} type={type} className="piece-svg" />
  );

  const renderSquare = (rank: number, file: number) => {
    const displayRank = flipBoard ? rank : 7 - rank;
    const displayFile = flipBoard ? 7 - file : file;
    const squareName = `${String.fromCharCode(97 + displayFile)}${displayRank + 1}` as Square;
    const isLight = (displayRank + displayFile) % 2 === 1;
    const piece = displayGame.get(squareName);
    const isSelected = !isViewingHistory && selectedSquare === squareName;
    const isValidMove = !isViewingHistory && validMoves.includes(squareName);
    const isLastMoveSquare = !isViewingHistory && lastMove && (lastMove.from === squareName || lastMove.to === squareName);
    const bestHintMove = currentHint?.topMoves[0]?.move;
    const isHintSquare = !isViewingHistory && showHint && bestHintMove && (bestHintMove.from === squareName || bestHintMove.to === squareName);
    const isCheck = piece && piece.type === 'k' && displayGame.inCheck() && piece.color === displayGame.turn();
    const isPremoveSquare = premove && (premove.from === squareName || premove.to === squareName);

    let className = `square ${isLight ? 'light' : 'dark'}`;
    if (isSelected) className += ' selected';
    if (isLastMoveSquare) className += ' last-move';
    if (isHintSquare) className += ' hint-highlight';
    if (isCheck) className += ' in-check';
    if (isPremoveSquare) className += ' premove';

    return (
      <div
        key={squareName}
        className={className}
        onClick={() => handleSquareClick(squareName)}
      >
        {file === 0 && <span className="coord-rank">{displayRank + 1}</span>}
        {rank === 7 && <span className="coord-file">{String.fromCharCode(97 + displayFile)}</span>}
        {isValidMove && !piece && <div className="valid-move-dot" />}
        {isValidMove && piece && <div className="valid-move-capture" />}
        {piece && renderPiece(piece.color, piece.type)}
      </div>
    );
  };

  const renderBoard = () => (
    <div
      className="board"
      onContextMenu={(e) => {
        e.preventDefault();
        setPremove(null);
        setSelectedSquare(null);
        setValidMoves([]);
      }}
    >
      {Array.from({ length: 8 }, (_, rank) =>
        Array.from({ length: 8 }, (_, file) => renderSquare(rank, file))
      )}
    </div>
  );

  const renderMoveList = () => {
    const pairs: { num: number; white?: string; black?: string; whiteIdx: number; blackIdx?: number }[] = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: moveHistory[i],
        black: moveHistory[i + 1],
        whiteIdx: i,
        blackIdx: moveHistory[i + 1] !== undefined ? i + 1 : undefined,
      });
    }

    const handleMoveClick = (idx: number) => {
      if (viewingMoveIndex === idx) {
        setViewingMoveIndex(null); // click again to go back to live
      } else {
        setViewingMoveIndex(idx);
      }
    };

    return (
      <div className="move-list" ref={moveListRef}>
        {pairs.length === 0 && <div className="move-list-empty">No moves yet</div>}
        {pairs.map(pair => (
          <div key={pair.num} className="move-pair">
            <span className="move-num">{pair.num}.</span>
            <span
              className={`move-white clickable ${viewingMoveIndex === pair.whiteIdx ? 'viewing' : ''}`}
              onClick={() => handleMoveClick(pair.whiteIdx)}
            >
              {pair.white}
            </span>
            {pair.black && pair.blackIdx !== undefined && (
              <span
                className={`move-black clickable ${viewingMoveIndex === pair.blackIdx ? 'viewing' : ''}`}
                onClick={() => handleMoveClick(pair.blackIdx!)}
              >
                {pair.black}
              </span>
            )}
          </div>
        ))}
        {isViewingHistory && (
          <button className="btn-small btn-back-to-live" onClick={() => setViewingMoveIndex(null)}>
            Back to current position
          </button>
        )}
      </div>
    );
  };

  const renderEvalBar = () => {
    const evaluation = evaluateBoard(game);
    const clampedEval = Math.max(-2000, Math.min(2000, evaluation));
    const whitePercent = 50 + (clampedEval / 2000) * 50;

    return (
      <div className="eval-bar-container">
        <div className="eval-bar">
          <div
            className="eval-bar-white"
            style={{
              height: `${whitePercent}%`,
              '--eval-pct': `${whitePercent}%`,
            } as React.CSSProperties}
          />
        </div>
        <span className="eval-label">
          {evaluation > 0 ? '+' : ''}{(evaluation / 100).toFixed(1)}
        </span>
      </div>
    );
  };

  // --- SCREENS ---

  if (phase === 'learn') {
    return (
      <div className="app">
        <Learn onBack={() => setPhase('menu')} />
      </div>
    );
  }

  if (phase === 'menu') {
    const inProgressGames = savedGames.filter(g => !g.result);
    const completedGames = savedGames.filter(g => g.result);

    return (
      <div className="app">
        <div className="menu-screen">
          <div className="menu-logo">
            <span className="menu-icon">
              <ChessPiece color="w" type="n" className="menu-piece-svg" />
            </span>
            <h1>Chess Coach</h1>
            <p className="menu-subtitle">Play, learn, and improve your chess</p>
            <div className="elo-display">
              <span className="elo-rating">{playerStats.elo}</span>
              <span className="elo-label">ELO Rating</span>
            </div>
          </div>

          {playerStats.totalGames > 0 && (
            <div className="stats-panel">
              <div className="stat-item">
                <span className="stat-value">{playerStats.totalGames}</span>
                <span className="stat-label">Games</span>
              </div>
              <div className="stat-item">
                <span className="stat-value stat-win">{playerStats.wins}</span>
                <span className="stat-label">Wins</span>
              </div>
              <div className="stat-item">
                <span className="stat-value stat-loss">{playerStats.losses}</span>
                <span className="stat-label">Losses</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{playerStats.draws}</span>
                <span className="stat-label">Draws</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{playerStats.totalGames > 0 ? Math.round(playerStats.wins / playerStats.totalGames * 100) : 0}%</span>
                <span className="stat-label">Win Rate</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{playerStats.bestStreak}</span>
                <span className="stat-label">Best Streak</span>
              </div>
            </div>
          )}

          <div className="menu-options">
            <div className="option-group">
              <label>Play as</label>
              <div className="toggle-group">
                <button
                  className={playerColor === 'w' ? 'active' : ''}
                  onClick={() => setPlayerColor('w')}
                >
                  <span className="color-icon"><ChessPiece color="w" type="k" className="toggle-piece-svg" /></span> White
                </button>
                <button
                  className={playerColor === 'b' ? 'active' : ''}
                  onClick={() => setPlayerColor('b')}
                >
                  <span className="color-icon"><ChessPiece color="b" type="k" className="toggle-piece-svg" /></span> Black
                </button>
              </div>
            </div>

            <div className="option-group">
              <label>Difficulty</label>
              <div className="toggle-group difficulty-group">
                {(['beginner', 'easy', 'medium', 'hard', 'expert', 'master'] as Difficulty[]).map(d => (
                  <button key={d} className={difficulty === d ? 'active' : ''} onClick={() => setDifficulty(d)}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <label>Time Control</label>
              <div className="toggle-group time-control-group">
                {([0, 60, 180, 300, 600, 900] as TimeControl[]).map(tc => (
                  <button
                    key={tc}
                    className={timeControl === tc ? 'active' : ''}
                    onClick={() => setTimeControl(tc)}
                  >
                    {TIME_LABELS[tc]}
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <label>Hints</label>
              <div className="toggle-group">
                <button className={hintsEnabled ? 'active' : ''} onClick={() => setHintsEnabled(true)}>On</button>
                <button className={!hintsEnabled ? 'active' : ''} onClick={() => setHintsEnabled(false)}>Off</button>
              </div>
            </div>
          </div>

          <button className="btn-primary start-btn" onClick={startGame}>
            New Game
          </button>
          <button className="btn-secondary learn-btn" onClick={() => setPhase('learn')}>
            Learn Chess
          </button>

          {/* Saved games */}
          {inProgressGames.length > 0 && (
            <div className="saved-games-section">
              <h3>Continue Playing</h3>
              <div className="saved-games-list">
                {inProgressGames.map(g => (
                  <div key={g.id} className="saved-game-card">
                    <div className="saved-game-info" onClick={() => resumeGame(g)}>
                      <div className="saved-game-top">
                        <span className="saved-game-color">
                          <ChessPiece color={g.playerColor} type="k" className="saved-piece-svg" />
                        </span>
                        <span className="saved-game-diff">{g.difficulty}</span>
                        <span className="saved-game-moves">{g.moveCount} moves</span>
                      </div>
                      <div className="saved-game-bottom">
                        <span className="saved-game-date" title={formatFullDate(g.date)}>
                          {formatDate(g.date)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="saved-game-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteGame(g.id); }}
                      title="Delete game"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedGames.length > 0 && (
            <div className="saved-games-section">
              <h3>Past Games</h3>
              <div className="saved-games-list">
                {completedGames.slice(0, 10).map(g => (
                  <div key={g.id} className="saved-game-card completed">
                    <div className="saved-game-info">
                      <div className="saved-game-top">
                        <span className="saved-game-color">
                          <ChessPiece color={g.playerColor} type="k" className="saved-piece-svg" />
                        </span>
                        <span className="saved-game-diff">{g.difficulty}</span>
                        <span className="saved-game-moves">{g.moveCount} moves</span>
                        <span className="saved-game-result-badge">{g.result}</span>
                      </div>
                      <div className="saved-game-bottom">
                        <span className="saved-game-date" title={formatFullDate(g.date)}>
                          {formatDate(g.date)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="saved-game-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeleteGame(g.id); }}
                      title="Delete game"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'analysis') {
    const currentAnalysis = analysisData[analysisIndex];
    if (!currentAnalysis) {
      return (
        <div className="app">
          <div className="analysis-screen">
            <h2>No moves to analyze</h2>
            <button className="btn-primary" onClick={() => setPhase('menu')}>Back to Menu</button>
          </div>
        </div>
      );
    }

    const analysisGame = new Chess();
    analysisGame.load(currentAnalysis.fen);

    const playerMoves = analysisData.filter(m => m.color === playerColor);
    const counts = { Excellent: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 };
    playerMoves.forEach(m => {
      const label = m.classification.label as keyof typeof counts;
      if (label in counts) counts[label]++;
    });

    return (
      <div className="app">
        <div className="analysis-screen">
          <div className="analysis-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <button className="btn-small" onClick={() => setPhase('menu')}>&#8592; Back</button>
              <h2>Game Analysis</h2>
            </div>
            <button className="btn-secondary" onClick={() => setPhase('menu')}>New Game</button>
          </div>

          <div className="analysis-layout">
            <div className="analysis-board-section">
              <div className="board analysis-board">
                {Array.from({ length: 8 }, (_, rank) =>
                  Array.from({ length: 8 }, (_, file) => {
                    const displayRank = flipBoard ? rank : 7 - rank;
                    const displayFile = flipBoard ? 7 - file : file;
                    const squareName = `${String.fromCharCode(97 + displayFile)}${displayRank + 1}` as Square;
                    const isLight = (displayRank + displayFile) % 2 === 1;
                    const piece = analysisGame.get(squareName);
                    return (
                      <div key={squareName} className={`square ${isLight ? 'light' : 'dark'}`}>
                        {file === 0 && <span className="coord-rank">{displayRank + 1}</span>}
                        {rank === 7 && <span className="coord-file">{String.fromCharCode(97 + displayFile)}</span>}
                        {piece && renderPiece(piece.color, piece.type)}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="analysis-nav">
                <button onClick={() => setAnalysisIndex(0)} disabled={analysisIndex === 0}>&#9664;&#9664;</button>
                <button onClick={() => setAnalysisIndex(Math.max(0, analysisIndex - 1))} disabled={analysisIndex === 0}>&#9664;</button>
                <span className="analysis-move-counter">
                  Move {currentAnalysis.moveNumber} ({currentAnalysis.color === 'w' ? 'White' : 'Black'})
                </span>
                <button onClick={() => setAnalysisIndex(Math.min(analysisData.length - 1, analysisIndex + 1))} disabled={analysisIndex === analysisData.length - 1}>&#9654;</button>
                <button onClick={() => setAnalysisIndex(analysisData.length - 1)} disabled={analysisIndex === analysisData.length - 1}>&#9654;&#9654;</button>
              </div>
            </div>

            <div className="analysis-panel">
              <div className="analysis-move-detail">
                <div className="analysis-move-san">
                  {currentAnalysis.moveNumber}.{currentAnalysis.color === 'b' ? '..' : ''} {currentAnalysis.san}
                </div>
                <div className="analysis-classification" style={{ background: currentAnalysis.classification.color }}>
                  {currentAnalysis.classification.label}
                </div>
                <p className="analysis-explanation">{currentAnalysis.explanation}</p>
                {currentAnalysis.bestMoveSan !== currentAnalysis.san && (
                  <p className="analysis-best">Best move: <strong>{currentAnalysis.bestMoveSan}</strong></p>
                )}
                <div className="analysis-eval">
                  Eval: {currentAnalysis.evaluation > 0 ? '+' : ''}{(currentAnalysis.evaluation / 100).toFixed(1)}
                </div>
              </div>

              <div className="analysis-summary">
                <h3>Your Move Quality</h3>
                <div className="summary-bars">
                  {Object.entries(counts).map(([label, count]) => (
                    <div key={label} className="summary-row">
                      <span className="summary-label">{label}</span>
                      <div className="summary-bar-track">
                        <div
                          className="summary-bar-fill"
                          style={{
                            width: `${playerMoves.length > 0 ? (count / playerMoves.length) * 100 : 0}%`,
                            background:
                              label === 'Excellent' ? '#22c55e' :
                              label === 'Good' ? '#84cc16' :
                              label === 'Inaccuracy' ? '#eab308' :
                              label === 'Mistake' ? '#f97316' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="summary-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-move-list">
                <h3>All Moves</h3>
                <div className="analysis-moves-scroll">
                  {analysisData.map((m, i) => (
                    <div
                      key={i}
                      className={`analysis-move-item ${i === analysisIndex ? 'active' : ''}`}
                      onClick={() => setAnalysisIndex(i)}
                    >
                      <span className="ami-number">{m.moveNumber}.{m.color === 'b' ? '..' : ''}</span>
                      <span className="ami-san">{m.san}</span>
                      <span className="ami-class" style={{ color: m.classification.color }}>
                        {m.classification.label[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playing or Game Over screen
  return (
    <div className="app">
      {promotionPending && (
        <div className="modal-overlay">
          <div className="promotion-dialog">
            <h3>Promote pawn to:</h3>
            <div className="promotion-options">
              {(['q', 'r', 'b', 'n'] as const).map(p => (
                <button key={p} onClick={() => handlePromotion(p)} className="promotion-piece">
                  <ChessPiece color={playerColor} type={p} className="promo-piece-svg" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="modal-overlay">
          <div className="gameover-dialog">
            <h2>Game Over</h2>
            <p className="gameover-result">{gameResult}</p>
            {lastEloChange !== null && (
              <div className="gameover-elo">
                <span className="gameover-elo-rating">Rating: {playerStats.elo}</span>
                <span className={`gameover-elo-change ${lastEloChange >= 0 ? 'positive' : 'negative'}`}>
                  {lastEloChange >= 0 ? '+' : ''}{lastEloChange}
                </span>
              </div>
            )}
            <div className="gameover-actions">
              <button className="btn-primary" onClick={startAnalysis} disabled={isAnalyzing}>
                {isAnalyzing ? `Analyzing... ${analysisProgress}%` : 'Analyze Game'}
              </button>
              <button className="btn-secondary" onClick={() => setPhase('menu')}>
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="game-screen">
        <div className="game-topbar">
          <div className="topbar-left">
            <button className="topbar-btn topbar-back" onClick={() => setPhase('menu')} title="Back to menu">
              &#8592;
            </button>
            <span className="topbar-logo">
              <ChessPiece color="w" type="n" className="topbar-piece-svg" />
            </span>
            <span className="topbar-title">Chess Coach</span>
          </div>
          <div className="topbar-right">
            <button
              className={`topbar-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Toggle sound"
            >
              {soundEnabled ? '\u266B' : '\u266A'}
            </button>
            <button
              className={`topbar-btn ${hintsEnabled ? 'active' : ''}`}
              onClick={() => setHintsEnabled(!hintsEnabled)}
              title="Toggle hints"
            >
              {hintsEnabled ? 'Hints: ON' : 'Hints: OFF'}
            </button>
            <button className="topbar-btn" onClick={() => setFlipBoard(!flipBoard)} title="Flip board">
              &#8693;
            </button>
            <button
              className="topbar-btn"
              onClick={undoMove}
              disabled={isThinking || moveHistory.length < 2 || phase !== 'playing'}
              title="Take back move"
            >
              Undo
            </button>
            {confirmingResign ? (
              <div className="resign-confirm">
                <span>Resign?</span>
                <button className="topbar-btn resign-yes" onClick={resign}>Yes</button>
                <button className="topbar-btn" onClick={() => setConfirmingResign(false)}>No</button>
              </div>
            ) : (
              <button className="topbar-btn resign-btn" onClick={resign} title="Resign">
                Resign
              </button>
            )}
          </div>
        </div>

        <div className="game-layout">
          {renderEvalBar()}

          <div className="board-container">
            <div className="player-label opponent">
              <div className="player-label-left">
                <span className="player-icon">
                  <ChessPiece color={playerColor === 'w' ? 'b' : 'w'} type="k" className="label-piece-svg" />
                </span>
                <span>Computer ({difficulty})</span>
                {isThinking && <span className="thinking-indicator">Thinking...</span>}
              </div>
              <div className="player-label-right">
                <div className="captured-pieces">
                  {(playerColor === 'w' ? whiteCaptured : blackCaptured).map((p, i) => (
                    <ChessPiece key={i} color={p.color} type={p.type} className="captured-svg" />
                  ))}
                  {(playerColor === 'w' ? materialAdvantage < 0 : materialAdvantage > 0) && (
                    <span className="material-diff">+{Math.abs(materialAdvantage)}</span>
                  )}
                </div>
                {timeControl > 0 && (
                  <div className={`clock ${game.turn() !== playerColor && phase === 'playing' ? 'clock-active' : ''} ${opponentTime <= 30 && opponentTime > 0 ? 'clock-low' : ''}`}>
                    {formatClock(opponentTime)}
                  </div>
                )}
              </div>
            </div>

            {renderBoard()}

            <div className="player-label self">
              <div className="player-label-left">
                <span className="player-icon">
                  <ChessPiece color={playerColor} type="k" className="label-piece-svg" />
                </span>
                <span>You</span>
              </div>
              <div className="player-label-right">
                <div className="captured-pieces">
                  {(playerColor === 'w' ? blackCaptured : whiteCaptured).map((p, i) => (
                    <ChessPiece key={i} color={p.color} type={p.type} className="captured-svg" />
                  ))}
                  {(playerColor === 'w' ? materialAdvantage > 0 : materialAdvantage < 0) && (
                    <span className="material-diff">+{Math.abs(materialAdvantage)}</span>
                  )}
                </div>
                {timeControl > 0 && (
                  <div className={`clock ${game.turn() === playerColor && phase === 'playing' ? 'clock-active' : ''} ${playerTime <= 30 && playerTime > 0 ? 'clock-low' : ''}`}>
                    {formatClock(playerTime)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="side-panel">
            {hintsEnabled && game.turn() === playerColor && currentHint && phase === 'playing' && !isViewingHistory && (
              <div className="hint-section">
                <h3>Coach</h3>
                {showHint ? (
                  <div className="hint-content">
                    {/* Opponent analysis */}
                    {currentHint.opponentAnalysis && (
                      <div className="hint-opponent">
                        <p>{currentHint.opponentAnalysis}</p>
                      </div>
                    )}

                    {/* Strategic themes */}
                    {currentHint.strategicThemes.length > 0 && (
                      <div className="hint-themes">
                        {currentHint.strategicThemes.map((t, i) => (
                          <span key={i} className="theme-badge">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Top 3 candidate moves */}
                    <div className="hint-candidates">
                      <div className="hint-candidates-label">Best moves:</div>
                      {currentHint.topMoves.map((tm, i) => (
                        <div key={i} className={`hint-candidate ${i === 0 ? 'best' : ''}`}>
                          <div className="hint-candidate-header">
                            <span className="hint-candidate-rank">#{i + 1}</span>
                            <strong className="hint-candidate-move">{tm.move.san}</strong>
                          </div>
                          <p className="hint-candidate-explanation">{tm.explanation}</p>
                        </div>
                      ))}
                    </div>

                    {/* Teaching advice */}
                    <div className="hint-advice">
                      <div className="hint-advice-label">What to look for</div>
                      <p>{currentHint.teachingAdvice}</p>
                    </div>

                    <button className="btn-small" onClick={() => setShowHint(false)}>Hide</button>
                  </div>
                ) : (
                  <button className="btn-small btn-hint" onClick={() => setShowHint(true)}>
                    Show coaching hint
                  </button>
                )}
              </div>
            )}

            <div className="moves-section">
              <h3>Moves</h3>
              {renderMoveList()}
            </div>

            <div className="status-section">
              {isViewingHistory && (
                <div className="status-viewing">
                  Viewing move {Math.floor(viewingMoveIndex! / 2) + 1}{viewingMoveIndex! % 2 === 1 ? '...' : ''}
                  <button className="btn-small" onClick={() => setViewingMoveIndex(null)}>Back to live</button>
                </div>
              )}
              {!isViewingHistory && game.inCheck() && phase === 'playing' && (
                <div className="status-check">Check!</div>
              )}
              {!isViewingHistory && game.turn() === playerColor && phase === 'playing' && !isThinking && (
                <div className="status-turn">Your turn</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

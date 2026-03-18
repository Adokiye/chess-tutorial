import { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, type Square } from 'chess.js';
import {
  getBestMove,
  getEnhancedHint,
  getValidMoves,
  analyzeGame,
  evaluateBoard,
  type MoveAnalysis,
  type EnhancedHint,
} from './engine';
import { ChessPiece } from './pieces';
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
type Difficulty = 'easy' | 'medium' | 'hard';
type PlayerColor = 'w' | 'b';

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
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null); // null = live position
  const moveListRef = useRef<HTMLDivElement>(null);

  const depthMap: Record<Difficulty, number> = { easy: 1, medium: 3, hard: 4 };

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

  // Load saved games on mount
  useEffect(() => {
    setSavedGames(loadGames());
  }, []);

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

  // Make AI move
  const makeAiMove = useCallback(() => {
    if (game.isGameOver()) return;

    setIsThinking(true);
    setTimeout(() => {
      const newGame = new Chess(game.fen());
      const depth = depthMap[difficulty];
      const result = getBestMove(newGame, depth);

      if (result) {
        newGame.move(result.move);
        setLastMove({ from: result.move.from as Square, to: result.move.to as Square });
        setMoveHistory(prev => [...prev, result.move.san]);
        setGame(newGame);
      }
      setIsThinking(false);
    }, 100);
  }, [game, difficulty]);

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

    setGameResult(result);
    setPhase('gameover');
  }, [game, phase, playerColor, isThinking, makeAiMove]);

  const startGame = () => {
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
    if (phase !== 'playing' || game.turn() !== playerColor || isThinking) return;

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
    const pgn = game.pgn();
    analyzeGame(pgn).then(data => {
      setAnalysisData(data);
      setAnalysisIndex(0);
      setIsAnalyzing(false);
      setPhase('analysis');
    });
  };

  const resign = () => {
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
    setGameResult(result);
    setPhase('gameover');
  };

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

    let className = `square ${isLight ? 'light' : 'dark'}`;
    if (isSelected) className += ' selected';
    if (isLastMoveSquare) className += ' last-move';
    if (isHintSquare) className += ' hint-highlight';
    if (isCheck) className += ' in-check';

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
    <div className="board">
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
          <div className="eval-bar-white" style={{ height: `${whitePercent}%` }} />
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
              <div className="toggle-group triple">
                <button className={difficulty === 'easy' ? 'active' : ''} onClick={() => setDifficulty('easy')}>Easy</button>
                <button className={difficulty === 'medium' ? 'active' : ''} onClick={() => setDifficulty('medium')}>Medium</button>
                <button className={difficulty === 'hard' ? 'active' : ''} onClick={() => setDifficulty('hard')}>Hard</button>
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
            <h2>Game Analysis</h2>
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
                {isAnalyzing ? 'Analyzing...' : 'Analyze Game'}
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
            <span className="topbar-logo">
              <ChessPiece color="w" type="n" className="topbar-piece-svg" />
            </span>
            <span className="topbar-title">Chess Coach</span>
          </div>
          <div className="topbar-right">
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
            <button className="topbar-btn resign-btn" onClick={resign} title="Resign">
              Resign
            </button>
          </div>
        </div>

        <div className="game-layout">
          {renderEvalBar()}

          <div className="board-container">
            <div className="player-label opponent">
              <span className="player-icon">
                <ChessPiece color={playerColor === 'w' ? 'b' : 'w'} type="k" className="label-piece-svg" />
              </span>
              <span>Computer ({difficulty})</span>
              {isThinking && <span className="thinking-indicator">Thinking...</span>}
            </div>

            {renderBoard()}

            <div className="player-label self">
              <span className="player-icon">
                <ChessPiece color={playerColor} type="k" className="label-piece-svg" />
              </span>
              <span>You</span>
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

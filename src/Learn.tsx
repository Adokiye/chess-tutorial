import { useState, useCallback, useMemo } from 'react';
import { Chess, type Square } from 'chess.js';
import {
  lessons,
  chessBooks,
  famousGames,
  chessPuzzles,
  type Lesson,
  type FamousGame,
  type ChessPuzzle,
} from './tutorialData';
import { ChessPiece } from './pieces';

type LearnTab = 'lessons' | 'books' | 'games' | 'puzzles';
type BookFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
type PuzzleFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

interface LearnProps {
  onBack: () => void;
}

interface PuzzlePlayerProps {
  puzzle: ChessPuzzle;
  onBack: () => void;
  onNextPuzzle: (() => void) | null;
}

function isValidGame(gameData: FamousGame): boolean {
  try {
    const game = new Chess();
    game.loadPgn(gameData.pgn);
    const totalMoves = game.history().length;
    return gameData.keyMoments.every(
      ({ moveIndex }) => moveIndex >= 0 && moveIndex < totalMoves
    );
  } catch {
    return false;
  }
}

function isValidPuzzle(puzzle: ChessPuzzle): boolean {
  try {
    const game = new Chess(puzzle.fen);
    for (const san of puzzle.solution) {
      game.move(san);
    }
    return true;
  } catch {
    return false;
  }
}

// Parse FEN into a board array without chess.js validation
// This handles display-only positions (e.g. lone pieces without kings)
function parseFenBoard(fen: string): ({ color: string; type: string } | null)[][] {
  const boardPart = fen.split(' ')[0];
  const rows = boardPart.split('/');
  const board: ({ color: string; type: string } | null)[][] = [];
  for (const row of rows) {
    const boardRow: ({ color: string; type: string } | null)[] = [];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) boardRow.push(null);
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase();
        boardRow.push({ color, type });
      }
    }
    board.push(boardRow);
  }
  return board;
}

function MiniBoard({ fen }: { fen: string }) {
  let board: ({ color: string; type: string } | null)[][];
  try {
    board = parseFenBoard(fen);
  } catch {
    return <div className="mini-board" />;
  }

  return (
    <div className="mini-board">
      {Array.from({ length: 8 }, (_, rank) =>
        Array.from({ length: 8 }, (_, file) => {
          const displayRank = 7 - rank;
          const displayFile = file;
          const isLight = (displayRank + displayFile) % 2 === 1;
          const piece = board[7 - displayRank]?.[displayFile] ?? null;
          return (
            <div key={`${displayFile}-${displayRank}`} className={`mini-square ${isLight ? 'light' : 'dark'}`}>
              {piece && (
                <ChessPiece color={piece.color} type={piece.type} className="mini-piece-svg" />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function GameViewer({ gameData, onBack }: { gameData: FamousGame; onBack: () => void }) {
  const [moveIndex, setMoveIndex] = useState(-1);

  const game = new Chess();
  game.loadPgn(gameData.pgn);
  const allMoves = game.history({ verbose: true });

  // Replay to current move index
  const displayGame = new Chess();
  for (let i = 0; i <= moveIndex && i < allMoves.length; i++) {
    displayGame.move(allMoves[i]);
  }

  // Find key moment comment for current move
  const keyMoment = gameData.keyMoments.find(km => km.moveIndex === moveIndex);

  // Build move pairs for the move list
  const movePairs: { num: number; white: string; black?: string; whiteIdx: number; blackIdx?: number }[] = [];
  for (let i = 0; i < allMoves.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: allMoves[i].san,
      black: allMoves[i + 1]?.san,
      whiteIdx: i,
      blackIdx: allMoves[i + 1] ? i + 1 : undefined,
    });
  }

  return (
    <div className="game-viewer">
      <div className="game-viewer-header">
        <button className="btn-small" onClick={onBack}>Back</button>
        <div className="game-viewer-title">
          <h3>{gameData.title}</h3>
          <p className="game-viewer-meta">
            {gameData.white} vs {gameData.black} ({gameData.year}) — {gameData.event}
          </p>
        </div>
      </div>

      <div className="game-viewer-layout">
        <div className="game-viewer-board-section">
          <div className="board game-viewer-board">
            {Array.from({ length: 8 }, (_, rank) =>
              Array.from({ length: 8 }, (_, file) => {
                const displayRank = 7 - rank;
                const displayFile = file;
                const squareName = `${String.fromCharCode(97 + displayFile)}${displayRank + 1}` as Square;
                const isLight = (displayRank + displayFile) % 2 === 1;
                const piece = displayGame.get(squareName);
                const isLastMove = moveIndex >= 0 && (
                  allMoves[moveIndex].from === squareName ||
                  allMoves[moveIndex].to === squareName
                );
                return (
                  <div
                    key={squareName}
                    className={`square ${isLight ? 'light' : 'dark'}${isLastMove ? ' last-move' : ''}`}
                  >
                    {file === 0 && <span className="coord-rank">{displayRank + 1}</span>}
                    {rank === 7 && <span className="coord-file">{String.fromCharCode(97 + displayFile)}</span>}
                    {piece && (
                      <ChessPiece color={piece.color} type={piece.type} className="piece-svg" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="game-viewer-controls">
            <button onClick={() => setMoveIndex(-1)} disabled={moveIndex < 0}>&#9664;&#9664;</button>
            <button onClick={() => setMoveIndex(Math.max(-1, moveIndex - 1))} disabled={moveIndex < 0}>&#9664;</button>
            <span className="game-viewer-counter">
              {moveIndex < 0 ? 'Start' : `${Math.floor(moveIndex / 2) + 1}.${moveIndex % 2 === 0 ? '' : '..'} ${allMoves[moveIndex].san}`}
            </span>
            <button onClick={() => setMoveIndex(Math.min(allMoves.length - 1, moveIndex + 1))} disabled={moveIndex >= allMoves.length - 1}>&#9654;</button>
            <button onClick={() => setMoveIndex(allMoves.length - 1)} disabled={moveIndex >= allMoves.length - 1}>&#9654;&#9654;</button>
          </div>
        </div>

        <div className="game-viewer-panel">
          <div className="game-viewer-description">
            <p>{gameData.description}</p>
          </div>

          {keyMoment && (
            <div className="game-viewer-key-moment">
              <h4>Key Moment</h4>
              <p>{keyMoment.comment}</p>
            </div>
          )}

          <div className="game-viewer-moves">
            <h4>Moves</h4>
            <div className="game-viewer-moves-scroll">
              {movePairs.map(pair => (
                <div key={pair.num} className="gv-move-pair">
                  <span className="gv-move-num">{pair.num}.</span>
                  <span
                    className={`gv-move ${pair.whiteIdx === moveIndex ? 'active' : ''} ${gameData.keyMoments.some(km => km.moveIndex === pair.whiteIdx) ? 'key' : ''}`}
                    onClick={() => setMoveIndex(pair.whiteIdx)}
                  >
                    {pair.white}
                  </span>
                  {pair.black && pair.blackIdx !== undefined && (
                    <span
                      className={`gv-move ${pair.blackIdx === moveIndex ? 'active' : ''} ${gameData.keyMoments.some(km => km.moveIndex === pair.blackIdx) ? 'key' : ''}`}
                      onClick={() => setMoveIndex(pair.blackIdx!)}
                    >
                      {pair.black}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="game-viewer-result">
            Result: <strong>{gameData.result}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonViewer({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  return (
    <div className="lesson-viewer">
      <div className="lesson-viewer-header">
        <button className="btn-small" onClick={onBack}>Back</button>
        <div>
          <span className={`difficulty-badge ${lesson.difficulty}`}>{lesson.difficulty}</span>
          <span className="lesson-category">{lesson.category}</span>
        </div>
      </div>

      <h2 className="lesson-title">{lesson.title}</h2>

      <div className="lesson-blocks">
        {lesson.content.map((block, i) => {
          if (block.type === 'text') {
            return (
              <div key={i} className="lesson-block text-block">
                {block.content.split('\n\n').map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            );
          }
          if (block.type === 'diagram') {
            return (
              <div key={i} className="lesson-block diagram-block">
                {block.fen && <MiniBoard fen={block.fen} />}
                <p className="diagram-caption">{block.content}</p>
              </div>
            );
          }
          if (block.type === 'tip') {
            return (
              <div key={i} className="lesson-block tip-block">
                <div className="tip-label">Tip</div>
                <p>{block.content}</p>
              </div>
            );
          }
          if (block.type === 'example') {
            return (
              <div key={i} className="lesson-block example-block">
                <div className="example-label">Example</div>
                <p>{block.content}</p>
              </div>
            );
          }
          if (block.type === 'illustration') {
            return (
              <div key={i} className="lesson-block illustration-block">
                <div className="illustration-header">
                  <div className="illustration-icon">
                    <ChessPiece color="w" type="n" className="illustration-piece-svg" />
                  </div>
                  <h4 className="illustration-title">{block.content}</h4>
                </div>
                {block.illustrationAlt && (
                  <div className="illustration-body">
                    {block.illustrationAlt.split('\n').map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
                  </div>
                )}
                {block.fen && <MiniBoard fen={block.fen} />}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function PuzzlePlayer({ puzzle, onBack, onNextPuzzle }: PuzzlePlayerProps) {
  const [game, setGame] = useState(() => new Chess(puzzle.fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [message, setMessage] = useState('Find the best move for the side to move.');

  const validMoves = selectedSquare
    ? game.moves({ square: selectedSquare, verbose: true }).map(m => m.to as Square)
    : [];

  const totalPlayerMoves = Math.ceil(puzzle.solution.length / 2);
  const completedPlayerMoves = Math.min(Math.ceil(solutionIndex / 2), totalPlayerMoves);

  const handleClick = useCallback((square: Square) => {
    if (status !== 'playing') return;

    const piece = game.get(square);
    const myColor = puzzle.toMove;

    // Select own piece
    if (piece && piece.color === myColor && game.turn() === myColor) {
      setSelectedSquare(square);
      return;
    }

    // Try to make a move
    if (selectedSquare && game.turn() === myColor) {
      try {
        const newGame = new Chess(game.fen());
        const move = newGame.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (move) {
          setLastMove({ from: selectedSquare, to: square });

          // Check if this matches the expected solution move
          const expectedSan = puzzle.solution[solutionIndex];
          if (move.san === expectedSan) {
            let nextIdx = solutionIndex + 1;
            const autoGame = new Chess(newGame.fen());
            let autoLastMove = { from: selectedSquare, to: square };

            while (nextIdx < puzzle.solution.length && autoGame.turn() !== puzzle.toMove) {
              const response = autoGame.move(puzzle.solution[nextIdx]);
              autoLastMove = {
                from: response.from as Square,
                to: response.to as Square,
              };
              nextIdx += 1;
            }

            setGame(autoGame);
            setLastMove(autoLastMove);
            setSolutionIndex(nextIdx);
            setMessage(
              nextIdx >= puzzle.solution.length
                ? 'Puzzle solved.'
                : 'Correct. Keep calculating.'
            );

            if (nextIdx >= puzzle.solution.length) {
              setStatus('correct');
            }
          } else {
            setGame(newGame);
            setStatus('wrong');
            setMessage(`Not quite. The expected move was ${expectedSan}.`);
          }
        }
      } catch {
        // invalid
      }
      setSelectedSquare(null);
    }
  }, [game, selectedSquare, status, solutionIndex, puzzle]);

  const reset = () => {
    setGame(new Chess(puzzle.fen));
    setSelectedSquare(null);
    setSolutionIndex(0);
    setStatus('playing');
    setLastMove(null);
    setShowHint(false);
    setMessage('Find the best move for the side to move.');
  };

  const flipBoard = puzzle.toMove === 'b';

  return (
    <div className="puzzle-player">
      <div className="puzzle-player-header">
        <button className="btn-small" onClick={onBack}>Back</button>
        <div>
          <h3 className="puzzle-player-title">{puzzle.title}</h3>
          <p className="puzzle-player-desc">{puzzle.description}</p>
        </div>
        <span className={`difficulty-badge ${puzzle.difficulty}`}>{puzzle.difficulty}</span>
      </div>

      <div className="puzzle-player-layout">
        <div className="puzzle-board-section">
          <div className="puzzle-to-move">
            {puzzle.toMove === 'w' ? 'White' : 'Black'} to move — {puzzle.theme}
          </div>
          <div className="puzzle-progress">
            Step {Math.min(completedPlayerMoves + 1, totalPlayerMoves)} of {totalPlayerMoves}
          </div>

          <div className="board puzzle-board">
            {Array.from({ length: 8 }, (_, rank) =>
              Array.from({ length: 8 }, (_, file) => {
                const displayRank = flipBoard ? rank : 7 - rank;
                const displayFile = flipBoard ? 7 - file : file;
                const squareName = `${String.fromCharCode(97 + displayFile)}${displayRank + 1}` as Square;
                const isLight = (displayRank + displayFile) % 2 === 1;
                const piece = game.get(squareName);
                const isSelected = selectedSquare === squareName;
                const isValid = validMoves.includes(squareName);
                const isLastMoveSquare = lastMove && (lastMove.from === squareName || lastMove.to === squareName);

                let className = `square ${isLight ? 'light' : 'dark'}`;
                if (isSelected) className += ' selected';
                if (isLastMoveSquare) className += ' last-move';
                if (status === 'correct' && isLastMoveSquare) className += ' puzzle-correct';
                if (status === 'wrong' && isLastMoveSquare) className += ' puzzle-wrong';

                return (
                  <div key={squareName} className={className} onClick={() => handleClick(squareName)}>
                    {file === 0 && <span className="coord-rank">{displayRank + 1}</span>}
                    {rank === 7 && <span className="coord-file">{String.fromCharCode(97 + displayFile)}</span>}
                    {isValid && !piece && <div className="valid-move-dot" />}
                    {isValid && piece && <div className="valid-move-capture" />}
                    {piece && <ChessPiece color={piece.color} type={piece.type} className="piece-svg" />}
                  </div>
                );
              })
            )}
          </div>

          {status === 'correct' && (
            <div className="puzzle-feedback correct">
              Correct! {message}
            </div>
          )}
          {status === 'wrong' && (
            <div className="puzzle-feedback wrong">
              {message}
            </div>
          )}
        </div>

        <div className="puzzle-info-panel">
          <div className="puzzle-status-card">
            <div className="puzzle-status-label">Progress</div>
            <p>{completedPlayerMoves} of {totalPlayerMoves} player moves found.</p>
          </div>
          {!showHint && status === 'playing' && (
            <button className="btn-small btn-hint" onClick={() => setShowHint(true)}>Show Hint</button>
          )}
          {showHint && (
            <div className="puzzle-hint-box">
              <div className="tip-label">Hint</div>
              <p>{puzzle.hint}</p>
            </div>
          )}

          {status !== 'playing' && (
            <div className="puzzle-action-buttons">
              <button className="btn-primary" onClick={reset}>
                Try Again
              </button>
              {status === 'correct' && onNextPuzzle && (
                <button className="btn-secondary" onClick={onNextPuzzle}>
                  Next Puzzle
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Learn({ onBack }: LearnProps) {
  const [tab, setTab] = useState<LearnTab>('lessons');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedGame, setSelectedGame] = useState<FamousGame | null>(null);
  const [selectedPuzzle, setSelectedPuzzle] = useState<ChessPuzzle | null>(null);
  const [bookFilter, setBookFilter] = useState<BookFilter>('all');
  const [lessonFilter, setLessonFilter] = useState<string>('all');
  const [puzzleFilter, setPuzzleFilter] = useState<PuzzleFilter>('all');

  const validGames = useMemo(
    () => famousGames.filter(isValidGame),
    []
  );
  const validPuzzles = useMemo(
    () => chessPuzzles.filter(isValidPuzzle),
    []
  );

  // Get unique lesson categories
  const categories = ['all', ...Array.from(new Set(lessons.map(l => l.category)))];

  const filteredLessons = lessonFilter === 'all'
    ? lessons
    : lessons.filter(l => l.category === lessonFilter);

  const filteredBooks = bookFilter === 'all'
    ? chessBooks
    : chessBooks.filter(b => b.level === bookFilter);

  const filteredPuzzles = puzzleFilter === 'all'
    ? validPuzzles
    : validPuzzles.filter(p => p.difficulty === puzzleFilter);

  const selectedPuzzleIndex = selectedPuzzle
    ? filteredPuzzles.findIndex(puzzle => puzzle.id === selectedPuzzle.id)
    : -1;
  const hasNextPuzzle = selectedPuzzleIndex >= 0 && selectedPuzzleIndex < filteredPuzzles.length - 1;

  const puzzleCounts = useMemo(() => ({
    total: validPuzzles.length,
    beginner: validPuzzles.filter(p => p.difficulty === 'beginner').length,
    intermediate: validPuzzles.filter(p => p.difficulty === 'intermediate').length,
    advanced: validPuzzles.filter(p => p.difficulty === 'advanced').length,
  }), [validPuzzles]);

  // If viewing a puzzle
  if (selectedPuzzle) {
    return (
      <div className="learn-screen">
        <PuzzlePlayer
          key={selectedPuzzle.id}
          puzzle={selectedPuzzle}
          onBack={() => setSelectedPuzzle(null)}
          onNextPuzzle={hasNextPuzzle ? () => setSelectedPuzzle(filteredPuzzles[selectedPuzzleIndex + 1]) : null}
        />
      </div>
    );
  }

  // If viewing a lesson
  if (selectedLesson) {
    return (
      <div className="learn-screen">
        <LessonViewer lesson={selectedLesson} onBack={() => setSelectedLesson(null)} />
      </div>
    );
  }

  // If viewing a game
  if (selectedGame) {
    return (
      <div className="learn-screen">
        <GameViewer gameData={selectedGame} onBack={() => setSelectedGame(null)} />
      </div>
    );
  }

  return (
    <div className="learn-screen">
      <div className="learn-header">
        <div className="learn-header-left">
          <button className="btn-small" onClick={onBack}>Back</button>
          <h2>Learn Chess</h2>
        </div>
      </div>

      {/* Tab bar */}
      <div className="learn-tabs">
        <button className={tab === 'lessons' ? 'active' : ''} onClick={() => setTab('lessons')}>
          Lessons
        </button>
        <button className={tab === 'puzzles' ? 'active' : ''} onClick={() => setTab('puzzles')}>
          Puzzles
        </button>
        <button className={tab === 'books' ? 'active' : ''} onClick={() => setTab('books')}>
          Books
        </button>
        <button className={tab === 'games' ? 'active' : ''} onClick={() => setTab('games')}>
          Famous Games
        </button>
      </div>

      {/* LESSONS TAB */}
      {tab === 'lessons' && (
        <div className="learn-content">
          <div className="learn-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-pill ${lessonFilter === cat ? 'active' : ''}`}
                onClick={() => setLessonFilter(cat)}
              >
                {cat === 'all' ? 'All Topics' : cat}
              </button>
            ))}
          </div>

          <div className="lessons-grid">
            {filteredLessons.map(lesson => (
              <div
                key={lesson.id}
                className="lesson-card"
                onClick={() => setSelectedLesson(lesson)}
              >
                <div className="lesson-card-top">
                  <span className={`difficulty-badge ${lesson.difficulty}`}>
                    {lesson.difficulty}
                  </span>
                  <span className="lesson-card-category">{lesson.category}</span>
                </div>
                <h3>{lesson.title}</h3>
                <p className="lesson-card-preview">
                  {lesson.content.find(b => b.type === 'text')?.content.slice(0, 120)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PUZZLES TAB */}
      {tab === 'puzzles' && (
        <div className="learn-content">
          <p className="games-intro">
            Solve tactical puzzles to sharpen your pattern recognition. Find the best move! Click a puzzle to start solving.
          </p>
          <div className="learn-summary-row">
            <div className="learn-summary-card">
              <span>Total puzzles</span>
              <strong>{puzzleCounts.total}</strong>
            </div>
            <div className="learn-summary-card">
              <span>Beginner</span>
              <strong>{puzzleCounts.beginner}</strong>
            </div>
            <div className="learn-summary-card">
              <span>Intermediate</span>
              <strong>{puzzleCounts.intermediate}</strong>
            </div>
            <div className="learn-summary-card">
              <span>Advanced</span>
              <strong>{puzzleCounts.advanced}</strong>
            </div>
          </div>

          <div className="learn-filters">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(level => (
              <button
                key={level}
                className={`filter-pill ${puzzleFilter === level ? 'active' : ''}`}
                onClick={() => setPuzzleFilter(level)}
              >
                {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>

          <div className="puzzles-grid">
            {filteredPuzzles.map(puzzle => (
              <div
                key={puzzle.id}
                className="puzzle-card"
                onClick={() => setSelectedPuzzle(puzzle)}
              >
                <div className="puzzle-card-top">
                  <span className={`difficulty-badge ${puzzle.difficulty}`}>{puzzle.difficulty}</span>
                  <span className="puzzle-theme-badge">{puzzle.theme}</span>
                </div>
                <h3>{puzzle.title}</h3>
                <p className="puzzle-card-desc">{puzzle.description}</p>
                <div className="puzzle-card-preview">
                  <MiniBoard fen={puzzle.fen} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOOKS TAB */}
      {tab === 'books' && (
        <div className="learn-content">
          <div className="learn-filters">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(level => (
              <button
                key={level}
                className={`filter-pill ${bookFilter === level ? 'active' : ''}`}
                onClick={() => setBookFilter(level)}
              >
                {level === 'all' ? 'All Levels' : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>

          <div className="books-list">
            {filteredBooks.map((book, i) => (
              <div key={i} className="book-card">
                <div className="book-card-header">
                  <div>
                    <h3>{book.title}</h3>
                    <p className="book-author">{book.author} ({book.year})</p>
                  </div>
                  <div className="book-badges">
                    <span className={`difficulty-badge ${book.level}`}>{book.level}</span>
                    <span className="book-category-badge">{book.category}</span>
                  </div>
                </div>
                <p className="book-description">{book.description}</p>
                <div className="book-why">
                  <strong>Why read this:</strong> {book.whyRead}
                </div>
                <div className="book-links">
                  {book.links.map((link, j) => (
                    <a
                      key={j}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="book-link"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAMOUS GAMES TAB */}
      {tab === 'games' && (
        <div className="learn-content">
          <p className="games-intro">
            Study these legendary games move by move. Click any game to replay it on an interactive board with commentary at key moments.
          </p>

          <div className="games-grid">
            {validGames.map(game => (
              <div
                key={game.id}
                className="game-card"
                onClick={() => setSelectedGame(game)}
              >
                <div className="game-card-year">{game.year}</div>
                <h3>{game.title}</h3>
                <p className="game-card-players">
                  {game.white} vs {game.black}
                </p>
                <p className="game-card-event">{game.event}</p>
                <p className="game-card-desc">
                  {game.description.slice(0, 150)}...
                </p>
                <div className="game-card-footer">
                  <span className="game-card-result">Result: {game.result}</span>
                  <span className="game-card-moments">{game.keyMoments.length} key moments</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

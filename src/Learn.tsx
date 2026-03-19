import { useState, useCallback } from 'react';
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

function MiniBoard({ fen }: { fen: string }) {
  let game: Chess;
  try {
    game = new Chess(fen);
  } catch {
    return <div className="mini-board" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: '0.8rem' }}>Invalid position</div>;
  }

  return (
    <div className="mini-board">
      {Array.from({ length: 8 }, (_, rank) =>
        Array.from({ length: 8 }, (_, file) => {
          const displayRank = 7 - rank;
          const displayFile = file;
          const squareName = `${String.fromCharCode(97 + displayFile)}${displayRank + 1}` as Square;
          const isLight = (displayRank + displayFile) % 2 === 1;
          const piece = game.get(squareName);
          return (
            <div key={squareName} className={`mini-square ${isLight ? 'light' : 'dark'}`}>
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
                {block.fen && (() => {
                  try {
                    return <MiniBoard fen={block.fen} />;
                  } catch {
                    return null;
                  }
                })()}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function PuzzlePlayer({ puzzle, onBack }: { puzzle: ChessPuzzle; onBack: () => void }) {
  const [game, setGame] = useState(() => new Chess(puzzle.fen));
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const validMoves = selectedSquare
    ? game.moves({ square: selectedSquare, verbose: true }).map(m => m.to as Square)
    : [];

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
          setGame(newGame);

          // Check if this matches the expected solution move
          const expectedSan = puzzle.solution[solutionIndex];
          if (move.san === expectedSan) {
            const nextIdx = solutionIndex + 1;
            if (nextIdx >= puzzle.solution.length) {
              setStatus('correct');
            } else {
              // Play the opponent's response
              setSolutionIndex(nextIdx);
              setTimeout(() => {
                const respGame = new Chess(newGame.fen());
                try {
                  const resp = respGame.move(puzzle.solution[nextIdx]);
                  if (resp) {
                    setLastMove({ from: resp.from as Square, to: resp.to as Square });
                    setGame(respGame);
                    setSolutionIndex(nextIdx + 1);
                    // Check if puzzle is done after response
                    if (nextIdx + 1 >= puzzle.solution.length) {
                      setStatus('correct');
                    }
                  }
                } catch {
                  setStatus('correct');
                }
              }, 400);
            }
          } else {
            setStatus('wrong');
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
              Correct! Well done.
            </div>
          )}
          {status === 'wrong' && (
            <div className="puzzle-feedback wrong">
              Not quite. The answer was <strong>{puzzle.solution[solutionIndex]}</strong>.
            </div>
          )}
        </div>

        <div className="puzzle-info-panel">
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
            <button className="btn-primary" onClick={reset} style={{ marginTop: '0.5rem' }}>
              Try Again
            </button>
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

  // Get unique lesson categories
  const categories = ['all', ...Array.from(new Set(lessons.map(l => l.category)))];

  const filteredLessons = lessonFilter === 'all'
    ? lessons
    : lessons.filter(l => l.category === lessonFilter);

  const filteredBooks = bookFilter === 'all'
    ? chessBooks
    : chessBooks.filter(b => b.level === bookFilter);

  const filteredPuzzles = puzzleFilter === 'all'
    ? chessPuzzles
    : chessPuzzles.filter(p => p.difficulty === puzzleFilter);

  // If viewing a puzzle
  if (selectedPuzzle) {
    return (
      <div className="learn-screen">
        <PuzzlePlayer puzzle={selectedPuzzle} onBack={() => setSelectedPuzzle(null)} />
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
            {famousGames.map(game => (
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

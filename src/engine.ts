import { Chess, type Square, type Move } from 'chess.js';

// Piece values for evaluation
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables for positional evaluation
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDDLEGAME_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20,
];

const PST: Record<string, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_MIDDLEGAME_TABLE,
};

function getPstValue(piece: string, square: number, isWhite: boolean): number {
  const table = PST[piece];
  if (!table) return 0;
  // Mirror the table for white (tables are from white's perspective, rank 8 at top)
  const index = isWhite ? square : (56 - (square & ~7)) + (square & 7);
  return table[index];
}

// Evaluate the board from white's perspective
export function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -99999 : 99999;
  }
  if (game.isDraw() || game.isStalemate()) return 0;

  let score = 0;
  const board = game.board();

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;
      const squareIndex = rank * 8 + file;
      const value = PIECE_VALUES[piece.type] + getPstValue(piece.type, squareIndex, piece.color === 'w');
      score += piece.color === 'w' ? value : -value;
    }
  }

  return score;
}

// Minimax with alpha-beta pruning
function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves({ verbose: true });

  // Move ordering: captures first, then checks
  moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10;
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10;
    return scoreB - scoreA;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export interface ScoredMove {
  move: Move;
  score: number;
}

// Get the best move for the current player
export function getBestMove(game: Chess, depth: number = 3): ScoredMove | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  const isWhite = game.turn() === 'w';
  let bestMove: Move | null = null;
  let bestScore = isWhite ? -Infinity : Infinity;

  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
    game.undo();

    if (isWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove ? { move: bestMove, score: bestScore } : null;
}

// Get top N moves ranked by evaluation
export function getTopMoves(game: Chess, n: number = 3, depth: number = 3): ScoredMove[] {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return [];

  const isWhite = game.turn() === 'w';
  const scoredMoves: ScoredMove[] = [];

  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isWhite);
    game.undo();
    scoredMoves.push({ move, score });
  }

  // Sort: best first for the current player
  scoredMoves.sort((a, b) => isWhite ? b.score - a.score : a.score - b.score);

  return scoredMoves.slice(0, n);
}

// Classify a move quality by comparing it to the best available move
export function classifyMove(
  moveScore: number,
  bestScore: number,
  isWhite: boolean
): { label: string; color: string } {
  const diff = isWhite ? bestScore - moveScore : moveScore - bestScore;

  if (diff <= 10) return { label: 'Excellent', color: '#22c55e' };
  if (diff <= 50) return { label: 'Good', color: '#84cc16' };
  if (diff <= 100) return { label: 'Inaccuracy', color: '#eab308' };
  if (diff <= 300) return { label: 'Mistake', color: '#f97316' };
  return { label: 'Blunder', color: '#ef4444' };
}

// Generate an explanation for why a move is good
export function explainMove(move: Move, game: Chess): string {
  const reasons: string[] = [];
  const pieceNames: Record<string, string> = {
    p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'
  };

  const pieceName = pieceNames[move.piece] || move.piece;

  // Capture explanation
  if (move.captured) {
    const capturedName = pieceNames[move.captured] || move.captured;
    reasons.push(`Captures the ${capturedName}, winning material`);
  }

  // Check if the move gives check
  const testGame = new Chess(game.fen());
  testGame.move(move);

  if (testGame.isCheckmate()) {
    return 'Checkmate! This move wins the game.';
  }

  if (testGame.inCheck()) {
    reasons.push('Puts the opponent\'s king in check, forcing a response');
  }

  // Center control
  const centralSquares = ['d4', 'd5', 'e4', 'e5'];
  if (centralSquares.includes(move.to)) {
    reasons.push(`Moves the ${pieceName} to the center, controlling key squares`);
  }

  // Castling
  if (move.flags.includes('k') || move.flags.includes('q')) {
    reasons.push('Castles to safety, protecting the king and connecting the rooks');
  }

  // Promotion
  if (move.promotion) {
    const promoName = pieceNames[move.promotion] || move.promotion;
    reasons.push(`Promotes the pawn to a ${promoName}, gaining a powerful piece`);
  }

  // Development (moving piece from back rank)
  const backRank = move.color === 'w' ? '1' : '8';
  if (move.from[1] === backRank && move.piece !== 'p' && move.piece !== 'k') {
    reasons.push(`Develops the ${pieceName}, bringing it into the game`);
  }

  // If no specific reason found, give a general positional explanation
  if (reasons.length === 0) {
    const evalBefore = evaluateBoard(game);
    const evalAfter = evaluateBoard(testGame);
    const improvement = move.color === 'w' ? evalAfter - evalBefore : evalBefore - evalAfter;

    if (improvement > 50) {
      reasons.push(`Improves your position significantly`);
    } else if (improvement > 0) {
      reasons.push(`A solid move that slightly improves your position`);
    } else {
      reasons.push(`Maintains a stable position`);
    }
  }

  return reasons.join('. ') + '.';
}

// Analyze a completed game move by move
export interface MoveAnalysis {
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  evaluation: number;
  bestMoveSan: string;
  bestMoveEval: number;
  classification: { label: string; color: string };
  explanation: string;
  fen: string;
}

export function analyzeGame(pgn: string): MoveAnalysis[] {
  const game = new Chess();
  game.loadPgn(pgn);
  const moves = game.history({ verbose: true });

  const analysis: MoveAnalysis[] = [];
  const replayGame = new Chess();

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const isWhite = move.color === 'w';
    const moveNumber = Math.floor(i / 2) + 1;

    // Find the best move at this position
    const best = getBestMove(replayGame, 3);
    const topMoves = getTopMoves(replayGame, 1, 3);
    const bestScore = topMoves.length > 0 ? topMoves[0].score : 0;
    const bestMoveSan = best ? best.move.san : move.san;

    // Evaluate the actual move played
    replayGame.move(move);
    const evalAfter = evaluateBoard(replayGame);

    // Classify the move
    const classification = classifyMove(
      evalAfter,
      bestScore,
      isWhite
    );

    // Build explanation
    let explanation = '';
    if (classification.label === 'Excellent') {
      explanation = bestMoveSan === move.san
        ? 'This was the best move in this position.'
        : 'Very close to the best move. Well played!';
    } else if (classification.label === 'Good') {
      explanation = `A solid choice. The engine slightly preferred ${bestMoveSan}.`;
    } else if (classification.label === 'Inaccuracy') {
      explanation = `A small inaccuracy. ${bestMoveSan} was stronger here.`;
    } else if (classification.label === 'Mistake') {
      explanation = `This was a mistake. ${bestMoveSan} was much better because it maintains a stronger position.`;
    } else {
      explanation = `A blunder that significantly worsens your position. ${bestMoveSan} was the correct move.`;
    }

    analysis.push({
      moveNumber,
      color: move.color,
      san: move.san,
      evaluation: evalAfter,
      bestMoveSan,
      bestMoveEval: bestScore,
      classification,
      explanation,
      fen: replayGame.fen(),
    });
  }

  return analysis;
}

// Get a hint for the current position
export function getHint(game: Chess): { move: Move; explanation: string } | null {
  const topMoves = getTopMoves(game, 1, 3);
  if (topMoves.length === 0) return null;

  const bestMove = topMoves[0].move;
  const explanation = explainMove(bestMove, game);

  return { move: bestMove, explanation };
}

// Get valid moves for a specific square
export function getValidMoves(game: Chess, square: Square): Square[] {
  const moves = game.moves({ square, verbose: true });
  return moves.map(m => m.to as Square);
}

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

// Generate a rich explanation for why a move is good
export function explainMove(move: Move, game: Chess): string {
  const reasons: string[] = [];
  const pieceNames: Record<string, string> = {
    p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'
  };

  const pieceName = pieceNames[move.piece] || move.piece;

  // Play the move on a test board
  const testGame = new Chess(game.fen());
  testGame.move(move);

  // Checkmate — nothing else to say
  if (testGame.isCheckmate()) {
    return 'Checkmate! This move wins the game immediately. The opponent\'s king has no escape squares, no piece can block the check, and the checking piece cannot be captured.';
  }

  // --- TACTICAL REASONS ---

  // Capture with value analysis
  if (move.captured) {
    const capturedName = pieceNames[move.captured] || move.captured;
    const capturedVal = PIECE_VALUES[move.captured] || 0;
    const movingVal = PIECE_VALUES[move.piece] || 0;
    if (capturedVal > movingVal) {
      reasons.push(`Captures the ${capturedName} (worth ${capturedVal / 100} points) with a ${pieceName} (worth ${movingVal / 100} points) — a net gain of ${(capturedVal - movingVal) / 100} points of material`);
    } else if (capturedVal === movingVal) {
      reasons.push(`Trades your ${pieceName} for the opponent's ${capturedName} — an equal exchange that simplifies the position`);
    } else {
      reasons.push(`Captures the ${capturedName}. Although the ${pieceName} is worth more, the resulting position compensates for the material`);
    }
  }

  // Check
  if (testGame.inCheck()) {
    const opponentMoves = testGame.moves().length;
    if (opponentMoves <= 3) {
      reasons.push(`Puts the king in check with very limited escape options (only ${opponentMoves} legal response${opponentMoves === 1 ? '' : 's'}), creating strong pressure`);
    } else {
      reasons.push('Gives check, forcing the opponent to deal with the threat before doing anything else — this gains you a tempo (free move)');
    }
  }

  // Castling
  if (move.flags.includes('k') || move.flags.includes('q')) {
    const side = move.flags.includes('k') ? 'kingside' : 'queenside';
    reasons.push(`Castles ${side}, moving the king to safety behind a wall of pawns. This also activates the rook, connecting it with the other rook along the back rank. Castling early is one of the most important opening principles`);
  }

  // Promotion
  if (move.promotion) {
    const promoName = pieceNames[move.promotion] || move.promotion;
    reasons.push(`Promotes the pawn to a ${promoName}! A pawn reaching the back rank becomes one of the most powerful pieces on the board — this is often game-deciding`);
  }

  // --- POSITIONAL REASONS ---

  // Center control
  const centralSquares = ['d4', 'd5', 'e4', 'e5'];
  const extendedCenter = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];
  if (centralSquares.includes(move.to)) {
    if (move.piece === 'p') {
      reasons.push(`Places a pawn in the center of the board. Central pawns control key squares and restrict the opponent's piece movement. A strong center is the foundation of a good position`);
    } else if (move.piece === 'n') {
      reasons.push(`Places the knight on a powerful central square where it controls up to 8 squares. Knights are strongest in the center — "a knight on the rim is dim" as the saying goes`);
    } else {
      reasons.push(`Occupies a strong central square with the ${pieceName}, where it exerts maximum influence across the board`);
    }
  } else if (extendedCenter.includes(move.to)) {
    reasons.push(`Moves the ${pieceName} to the extended center, supporting control of the key central squares (d4, d5, e4, e5)`);
  }

  // Development (moving piece from back rank)
  const backRank = move.color === 'w' ? '1' : '8';
  if (move.from[1] === backRank && move.piece !== 'p' && move.piece !== 'k') {
    const developedCount = countDevelopedPieces(game, move.color);
    if (developedCount <= 2) {
      reasons.push(`Develops the ${pieceName} from its starting square — getting pieces into the game quickly is critical in the opening. You should aim to develop all minor pieces (knights and bishops) before launching any attacks`);
    } else {
      reasons.push(`Brings the ${pieceName} into play. With most pieces already developed, you're building a well-coordinated army`);
    }
  }

  // Fianchetto (bishop to g2, b2, g7, b7)
  if (move.piece === 'b' && ['g2', 'b2', 'g7', 'b7'].includes(move.to)) {
    reasons.push(`Fianchettoes the bishop on the long diagonal. From here, the bishop has a powerful long-range view across the board, often targeting the opponent's kingside or center`);
  }

  // Piece moving to an outpost (square protected by own pawn, can't be attacked by enemy pawn)
  if (move.piece === 'n' && !centralSquares.includes(move.to)) {
    if (isOutpost(game, move.to, move.color)) {
      reasons.push(`Places the knight on an outpost — a square protected by your pawns where it can't be chased away by enemy pawns. An outpost knight is a powerful positional asset`);
    }
  }

  // Rook to open or semi-open file
  if (move.piece === 'r') {
    const file = move.to[0];
    const fileStatus = getFileStatus(game, file, move.color);
    if (fileStatus === 'open') {
      reasons.push(`Places the rook on an open file (no pawns blocking it). Rooks are most effective on open files where they can penetrate deep into the opponent's position`);
    } else if (fileStatus === 'semi-open') {
      reasons.push(`Places the rook on a semi-open file, where it pressures the opponent's pawn and can potentially break through`);
    }
    // Rook on 7th rank
    const seventhRank = move.color === 'w' ? '7' : '2';
    if (move.to[1] === seventhRank) {
      reasons.push(`The rook reaches the ${seventhRank === '7' ? '7th' : '2nd'} rank — often called "a pig on the 7th." From here it attacks pawns and restricts the enemy king to the back rank`);
    }
  }

  // Pawn structure considerations
  if (move.piece === 'p') {
    // Pawn advance creating passed pawn
    if (isPassedPawn(testGame, move.to, move.color)) {
      reasons.push(`Creates a passed pawn — a pawn with no enemy pawns that can block or capture it on its way to promotion. Passed pawns are extremely dangerous, especially in endgames`);
    }
    // Pawn chain support
    const file = move.to.charCodeAt(0) - 97;
    const rank = parseInt(move.to[1]);
    const supportRank = move.color === 'w' ? rank - 1 : rank + 1;
    const leftFile = String.fromCharCode(96 + file);
    const rightFile = String.fromCharCode(98 + file);
    const leftSupport = leftFile >= 'a' && leftFile <= 'h' ? game.get(`${leftFile}${supportRank}` as Square) : null;
    const rightSupport = rightFile >= 'a' && rightFile <= 'h' ? game.get(`${rightFile}${supportRank}` as Square) : null;
    if ((leftSupport && leftSupport.type === 'p' && leftSupport.color === move.color) ||
        (rightSupport && rightSupport.type === 'p' && rightSupport.color === move.color)) {
      reasons.push(`This pawn is supported by a neighboring pawn, creating a strong connected pawn chain that's difficult for the opponent to break`);
    }
  }

  // Queen activity (but warn about early queen moves)
  if (move.piece === 'q') {
    const moveNum = Math.ceil(game.moveNumber());
    if (moveNum <= 6) {
      reasons.push(`Moves the queen early in the game. While the queen is the most powerful piece, be careful — early queen moves can lose tempo if the opponent attacks it with developing moves`);
    }
  }

  // Threatening opponent pieces after the move
  const threatsAfter = countThreats(testGame, move.color);
  const threatsBefore = countThreats(game, move.color);
  if (threatsAfter > threatsBefore && !move.captured && !testGame.inCheck()) {
    const newThreats = threatsAfter - threatsBefore;
    if (newThreats >= 2) {
      reasons.push(`Creates multiple new threats that the opponent must address, putting them on the defensive`);
    } else {
      reasons.push(`Creates a new threat, forcing the opponent to respond defensively`);
    }
  }

  // Restricting opponent's mobility
  const opponentMobilityBefore = game.moves().length;
  // Switch perspective for opponent mobility after
  const opponentMobilityAfter = testGame.moves().length;
  if (opponentMobilityAfter < opponentMobilityBefore * 0.7 && opponentMobilityBefore > 10) {
    reasons.push(`Significantly restricts the opponent's options — they now have fewer good moves available. Limiting your opponent's mobility is a key strategic concept`);
  }

  // --- EVAL-BASED FALLBACK (enriched) ---
  if (reasons.length === 0) {
    const evalBefore = evaluateBoard(game);
    const evalAfter = evaluateBoard(testGame);
    const improvement = move.color === 'w' ? evalAfter - evalBefore : evalBefore - evalAfter;

    if (improvement > 100) {
      reasons.push(`Significantly improves your position. The ${pieceName} is much more active on ${move.to} than it was on ${move.from}`);
    } else if (improvement > 30) {
      reasons.push(`A good improving move. The ${pieceName} on ${move.to} has better scope and activity than on ${move.from}, giving you a slight edge`);
    } else if (improvement > 0) {
      reasons.push(`A solid positional move. The ${pieceName} moves to a slightly better square, keeping your position healthy`);
    } else {
      // Even when eval is flat, explain what the move does
      if (move.piece === 'n' || move.piece === 'b') {
        reasons.push(`Repositions the ${pieceName} to ${move.to}. While the evaluation stays roughly equal, finding the best squares for your pieces is the essence of good positional play. Look for squares where the ${pieceName} is active, protected, and hard to dislodge`);
      } else if (move.piece === 'p') {
        reasons.push(`Advances the pawn to ${move.to}, gaining space and potentially opening lines for your pieces. Pawn moves are permanent (pawns can't go backward), so each one shapes the character of the position`);
      } else if (move.piece === 'r') {
        reasons.push(`Repositions the rook to ${move.to}, seeking an open file or preparing to double rooks. Rooks need open lines to be effective — look for files without pawns blocking them`);
      } else if (move.piece === 'q') {
        reasons.push(`Repositions the queen to ${move.to}. The queen is versatile but vulnerable to attack — place it where it's active but not easily harassed by enemy minor pieces`);
      } else {
        reasons.push(`Moves the ${pieceName} to ${move.to}, maintaining balance. In equal positions, focus on improving your worst-placed piece and creating small advantages that can accumulate over time`);
      }
    }
  }

  // Add strategic context based on game phase
  const moveNum = Math.ceil(game.moveNumber());
  if (reasons.length <= 2) {
    if (moveNum <= 10) {
      reasons.push('In the opening, prioritize: 1) controlling the center, 2) developing pieces, and 3) castling your king to safety');
    } else if (moveNum <= 25) {
      reasons.push('In the middlegame, look for tactical opportunities while improving the placement of your pieces. Ask yourself: what is my worst-placed piece, and how can I improve it?');
    } else {
      reasons.push('In the endgame, activate your king (it becomes a fighting piece!) and push passed pawns. Every tempo counts');
    }
  }

  return reasons.join('. ') + '.';
}

// --- Helper functions for explainMove ---

function countDevelopedPieces(game: Chess, color: 'w' | 'b'): number {
  const backRank = color === 'w' ? '1' : '8';
  let developed = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.color === color && piece.type !== 'p' && piece.type !== 'k' && piece.type !== 'r') {
        const rank = String(8 - r);
        if (rank !== backRank) developed++;
      }
    }
  }
  return developed;
}

function isOutpost(game: Chess, square: string, color: 'w' | 'b'): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]);
  const enemyPawnDir = color === 'w' ? 1 : -1;
  // Check if enemy pawns can attack this square
  for (let r = rank; r >= 1 && r <= 8; r += enemyPawnDir) {
    for (const df of [-1, 1]) {
      const f = file + df;
      if (f < 0 || f > 7) continue;
      const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
      const piece = game.get(sq);
      if (piece && piece.type === 'p' && piece.color !== color) return false;
    }
  }
  return true;
}

function getFileStatus(game: Chess, file: string, color: 'w' | 'b'): 'open' | 'semi-open' | 'closed' {
  let ownPawn = false;
  let enemyPawn = false;
  for (let rank = 1; rank <= 8; rank++) {
    const sq = `${file}${rank}` as Square;
    const piece = game.get(sq);
    if (piece && piece.type === 'p') {
      if (piece.color === color) ownPawn = true;
      else enemyPawn = true;
    }
  }
  if (!ownPawn && !enemyPawn) return 'open';
  if (!ownPawn && enemyPawn) return 'semi-open';
  return 'closed';
}

function isPassedPawn(game: Chess, square: string, color: 'w' | 'b'): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]);
  const direction = color === 'w' ? 1 : -1;
  const endRank = color === 'w' ? 8 : 1;
  for (let r = rank + direction; color === 'w' ? r <= endRank : r >= endRank; r += direction) {
    for (const df of [-1, 0, 1]) {
      const f = file + df;
      if (f < 0 || f > 7) continue;
      const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
      const piece = game.get(sq);
      if (piece && piece.type === 'p' && piece.color !== color) return false;
    }
  }
  return true;
}

function countThreats(game: Chess, color: 'w' | 'b'): number {
  // Count how many opponent pieces are attacked
  let threats = 0;
  const board = game.board();
  const opponentColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.color === opponentColor && piece.type !== 'k') {
        const sq = `${String.fromCharCode(97 + f)}${8 - r}` as Square;
        if (game.isAttacked(sq, color)) threats++;
      }
    }
  }
  return threats;
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

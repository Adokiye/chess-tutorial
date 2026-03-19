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

// Transposition table for caching evaluated positions
const TT_SIZE = 1 << 18; // 262144 entries
const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;
interface TTEntry { key: string; depth: number; score: number; flag: number; }
const ttable: (TTEntry | null)[] = new Array(TT_SIZE).fill(null);

function ttHash(fen: string): number {
  let h = 0;
  for (let i = 0; i < fen.length; i++) {
    h = ((h << 5) - h + fen.charCodeAt(i)) | 0;
  }
  return (h & 0x7fffffff) % TT_SIZE;
}

// Quiescence search: resolve captures so we don't misevaluate tactical positions
function quiescence(game: Chess, alpha: number, beta: number, maxQDepth: number): number {
  const rawEval = evaluateBoard(game);
  const standPat = game.turn() === 'w' ? rawEval : -rawEval; // negamax: score from side-to-move's perspective
  if (maxQDepth <= 0) return standPat;
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const captures = game.moves({ verbose: true }).filter(m => m.captured);
  // MVV-LVA ordering
  captures.sort((a, b) => {
    const aVal = (PIECE_VALUES[a.captured!] || 0) - (PIECE_VALUES[a.piece] || 0);
    const bVal = (PIECE_VALUES[b.captured!] || 0) - (PIECE_VALUES[b.piece] || 0);
    return bVal - aVal;
  });

  for (const move of captures) {
    game.move(move);
    const score = -quiescence(game, -beta, -alpha, maxQDepth - 1);
    game.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// Minimax with alpha-beta pruning, transposition table, and quiescence search
function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    if (depth === 0 && !game.isGameOver()) {
      // Use quiescence search with narrowed alpha-beta window
      if (isMaximizing) {
        return quiescence(game, alpha, beta, 4);
      } else {
        return -quiescence(game, -beta, -alpha, 4);
      }
    }
    return evaluateBoard(game);
  }

  // Transposition table lookup
  const fenKey = game.fen();
  const ttIdx = ttHash(fenKey);
  const ttEntry = ttable[ttIdx];
  if (ttEntry && ttEntry.key === fenKey && ttEntry.depth >= depth) {
    if (ttEntry.flag === TT_EXACT) return ttEntry.score;
    if (ttEntry.flag === TT_ALPHA && ttEntry.score <= alpha) return alpha;
    if (ttEntry.flag === TT_BETA && ttEntry.score >= beta) return beta;
  }

  const moves = game.moves({ verbose: true });

  // Better move ordering: captures (MVV-LVA), checks, center moves, then rest
  moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.captured) scoreA += (PIECE_VALUES[a.captured] || 0) * 10 - (PIECE_VALUES[a.piece] || 0);
    if (b.captured) scoreB += (PIECE_VALUES[b.captured] || 0) * 10 - (PIECE_VALUES[b.piece] || 0);
    // Promotion bonus
    if (a.promotion) scoreA += 8000;
    if (b.promotion) scoreB += 8000;
    // Center moves
    const center = ['d4','d5','e4','e5'];
    if (center.includes(a.to)) scoreA += 30;
    if (center.includes(b.to)) scoreB += 30;
    return scoreB - scoreA;
  });

  let bestScore = isMaximizing ? -Infinity : Infinity;
  let ttFlag = isMaximizing ? TT_ALPHA : TT_BETA;

  for (const move of moves) {
    game.move(move);
    const evaluation = minimax(game, depth - 1, alpha, beta, !isMaximizing);
    game.undo();

    if (isMaximizing) {
      if (evaluation > bestScore) bestScore = evaluation;
      if (bestScore > alpha) { alpha = bestScore; ttFlag = TT_EXACT; }
      if (beta <= alpha) { ttFlag = TT_BETA; break; }
    } else {
      if (evaluation < bestScore) bestScore = evaluation;
      if (bestScore < beta) { beta = bestScore; ttFlag = TT_EXACT; }
      if (beta <= alpha) { ttFlag = TT_ALPHA; break; }
    }
  }

  // Store in transposition table
  ttable[ttIdx] = { key: fenKey, depth, score: bestScore, flag: ttFlag };

  return bestScore;
}

export interface ScoredMove {
  move: Move;
  score: number;
}

// Get the best move for the current player
export function getBestMove(game: Chess, depth: number = 3): ScoredMove | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Sort root moves for better alpha-beta pruning
  moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.captured) scoreA += (PIECE_VALUES[a.captured] || 0) * 10 - (PIECE_VALUES[a.piece] || 0);
    if (b.captured) scoreB += (PIECE_VALUES[b.captured] || 0) * 10 - (PIECE_VALUES[b.piece] || 0);
    if (a.promotion) scoreA += 8000;
    if (b.promotion) scoreB += 8000;
    const center = ['d4','d5','e4','e5'];
    if (center.includes(a.to)) scoreA += 30;
    if (center.includes(b.to)) scoreB += 30;
    return scoreB - scoreA;
  });

  const isWhite = game.turn() === 'w';
  let bestMove: Move | null = null;
  let bestScore = isWhite ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of moves) {
    game.move(move);
    const score = minimax(game, depth - 1, alpha, beta, !isWhite);
    game.undo();

    if (isWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score > alpha) alpha = score;
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
      if (score < beta) beta = score;
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

// Analyze game async in chunks to avoid blocking the UI
export function analyzeGame(pgn: string, onProgress?: (pct: number) => void): Promise<MoveAnalysis[]> {
  return new Promise((resolve) => {
    const game = new Chess();
    game.loadPgn(pgn);
    const moves = game.history({ verbose: true });
    const analysis: MoveAnalysis[] = [];
    const replayGame = new Chess();
    let i = 0;

    function processChunk() {
      const chunkEnd = Math.min(i + 3, moves.length); // 3 moves per chunk
      while (i < chunkEnd) {
        const move = moves[i];
        const isWhite = move.color === 'w';
        const moveNumber = Math.floor(i / 2) + 1;

        // Find the best move (depth 2 for speed)
        const best = getBestMove(replayGame, 2);
        const bestScore = best ? best.score : 0;
        const bestMoveSan = best ? best.move.san : move.san;

        // Evaluate the actual move played
        replayGame.move(move);
        const evalAfter = evaluateBoard(replayGame);

        // Classify the move
        const classification = classifyMove(evalAfter, bestScore, isWhite);

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

        i++;
      }

      if (i < moves.length) {
        if (onProgress) onProgress(Math.round((i / moves.length) * 100));
        setTimeout(processChunk, 0); // yield to UI between chunks
      } else {
        if (onProgress) onProgress(100);
        resolve(analysis);
      }
    }

    processChunk();
  });
}

// ─── Enhanced Hint System ───

export interface EnhancedHint {
  topMoves: { move: Move; score: number; explanation: string }[];
  opponentAnalysis: string;
  strategicThemes: string[];
  teachingAdvice: string;
}

export function getEnhancedHint(game: Chess, playerColor: 'w' | 'b'): EnhancedHint | null {
  const top = getTopMoves(game, 3, 3);
  if (top.length === 0) return null;

  const topMoves = top.map(t => ({
    move: t.move,
    score: t.score,
    explanation: explainMove(t.move, game),
  }));

  const opponentAnalysis = analyzeOpponentLastMove(game, playerColor);
  const strategicThemes = detectStrategicThemes(game, playerColor);
  const teachingAdvice = getTeachingAdvice(game, strategicThemes, playerColor);

  return { topMoves, opponentAnalysis, strategicThemes, teachingAdvice };
}

function analyzeOpponentLastMove(game: Chess, playerColor: 'w' | 'b'): string {
  const history = game.history({ verbose: true });
  if (history.length === 0) return '';
  const last = history[history.length - 1];
  if (last.color === playerColor) return ''; // Last move was ours

  const pieceNames: Record<string, string> = {
    p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'
  };
  const pn = pieceNames[last.piece] || last.piece;
  const parts: string[] = [];

  if (last.captured) {
    const cn = pieceNames[last.captured] || last.captured;
    parts.push(`captured your ${cn} with their ${pn}`);
  }

  if (game.inCheck()) {
    parts.push('put your king in check — you must deal with this immediately');
  }

  if (last.flags.includes('k') || last.flags.includes('q')) {
    parts.push('castled, securing their king and activating their rook');
  }

  const centralSquares = ['d4', 'd5', 'e4', 'e5'];
  if (centralSquares.includes(last.to) && !last.captured) {
    parts.push(`moved their ${pn} to the center (${last.to}), strengthening their grip on key squares`);
  }

  const backRank = last.color === 'w' ? '1' : '8';
  if (last.from[1] === backRank && last.piece !== 'p' && last.piece !== 'k' && !last.captured) {
    parts.push(`developed their ${pn} to ${last.to}`);
  }

  // Check if opponent is building an attack on our king
  const kingSquare = findKing(game, playerColor);
  if (kingSquare) {
    const attackers = countAttackersNearKing(game, playerColor, kingSquare);
    if (attackers >= 2) {
      parts.push('building pressure near your king — be alert for incoming threats');
    }
  }

  if (last.piece === 'r') {
    const file = last.to[0];
    const status = getFileStatus(game, file, last.color);
    if (status === 'open' || status === 'semi-open') {
      parts.push(`placed their rook on an ${status} file, increasing its power`);
    }
  }

  if (parts.length === 0) {
    parts.push(`moved their ${pn} from ${last.from} to ${last.to}`);
  }

  return 'Your opponent ' + parts.join(', and ') + '.';
}

function findKing(game: Chess, color: 'w' | 'b'): string | null {
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === 'k' && p.color === color) {
        return `${String.fromCharCode(97 + f)}${8 - r}`;
      }
    }
  }
  return null;
}

function countAttackersNearKing(game: Chess, kingColor: 'w' | 'b', kingSquare: string): number {
  const kf = kingSquare.charCodeAt(0) - 97;
  const kr = parseInt(kingSquare[1]);
  const attackerColor = kingColor === 'w' ? 'b' : 'w';
  let count = 0;
  for (let df = -2; df <= 2; df++) {
    for (let dr = -2; dr <= 2; dr++) {
      const f = kf + df;
      const r = kr + dr;
      if (f < 0 || f > 7 || r < 1 || r > 8) continue;
      const sq = `${String.fromCharCode(97 + f)}${r}` as Square;
      const piece = game.get(sq);
      if (piece && piece.color === attackerColor && piece.type !== 'p') count++;
    }
  }
  return count;
}

function detectStrategicThemes(game: Chess, playerColor: 'w' | 'b'): string[] {
  const themes: string[] = [];
  const opponentColor = playerColor === 'w' ? 'b' : 'w';
  const board = game.board();

  // Development check
  const developed = countDevelopedPieces(game, playerColor);
  const moveNum = Math.ceil(game.moveNumber());
  if (moveNum <= 12 && developed < 3) {
    themes.push('Development needed');
  }

  // King safety
  const kingSquare = findKing(game, playerColor);
  if (kingSquare) {
    // Check if castled (king on g1/c1 or g8/c8)
    const castledSquares = playerColor === 'w' ? ['g1', 'c1'] : ['g8', 'c8'];
    const isCastled = castledSquares.includes(kingSquare);
    if (!isCastled && moveNum > 8) {
      themes.push('King still in center');
    }
    if (countAttackersNearKing(game, playerColor, kingSquare) >= 2) {
      themes.push('King under pressure');
    }
  }

  // Fork opportunities — check if any candidate move attacks 2+ pieces
  const moves = game.moves({ verbose: true });
  for (const m of moves.slice(0, 15)) {
    const testG = new Chess(game.fen());
    testG.move(m);
    let attacked = 0;
    const tb = testG.board();
    for (let r2 = 0; r2 < 8; r2++) {
      for (let f2 = 0; f2 < 8; f2++) {
        const p2 = tb[r2][f2];
        if (p2 && p2.color === opponentColor && p2.type !== 'p') {
          const sq2 = `${String.fromCharCode(97 + f2)}${8 - r2}` as Square;
          if (testG.isAttacked(sq2, playerColor)) attacked++;
        }
      }
    }
    if (attacked >= 2 && m.piece === 'n') {
      themes.push('Fork opportunity');
      break;
    }
  }

  // Open files for rooks
  for (let f = 0; f < 8; f++) {
    const file = String.fromCharCode(97 + f);
    const status = getFileStatus(game, file, playerColor);
    if (status === 'open' || status === 'semi-open') {
      // Check if we have a rook that could use this file
      let hasRookOnFile = false;
      for (let r = 1; r <= 8; r++) {
        const p = game.get(`${file}${r}` as Square);
        if (p && p.type === 'r' && p.color === playerColor) hasRookOnFile = true;
      }
      if (!hasRookOnFile) {
        themes.push('Open file available');
        break;
      }
    }
  }

  // Material advantage/disadvantage
  let materialDiff = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type !== 'k') {
        const val = PIECE_VALUES[p.type] || 0;
        materialDiff += p.color === playerColor ? val : -val;
      }
    }
  }
  if (materialDiff > 200) themes.push('Material advantage');
  if (materialDiff < -200) themes.push('Material deficit');

  // Passed pawns
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === 'p' && p.color === playerColor) {
        const sq = `${String.fromCharCode(97 + f)}${8 - r}`;
        if (isPassedPawn(game, sq, playerColor)) {
          themes.push('Passed pawn');
          break;
        }
      }
    }
  }

  return [...new Set(themes)]; // deduplicate
}

function getTeachingAdvice(game: Chess, themes: string[], _playerColor: 'w' | 'b'): string {
  const moveNum = Math.ceil(game.moveNumber());

  // Priority-based advice
  if (game.inCheck()) {
    return 'You\'re in check! You must block, capture the attacker, or move your king. Look for a response that also improves your position — sometimes the best defense is a counter-threat.';
  }

  if (themes.includes('Fork opportunity')) {
    return 'There\'s a fork opportunity in this position! Look for a knight move that attacks two or more valuable pieces at once. The opponent can only save one, so you win material.';
  }

  if (themes.includes('King under pressure')) {
    return 'Your king is under pressure. Consider defensive moves: block attack lines, trade off attacking pieces, or create a counter-attack. Sometimes the best defense is to threaten something even bigger.';
  }

  if (themes.includes('King still in center') && themes.includes('Development needed')) {
    return 'Your king is still in the center and you have undeveloped pieces. Priority: get your minor pieces out and castle as soon as possible. An exposed king in the center is the #1 cause of quick losses.';
  }

  if (themes.includes('King still in center')) {
    return 'Your king hasn\'t castled yet. Look for a way to castle soon — an uncastled king becomes increasingly vulnerable as more pieces enter the game.';
  }

  if (themes.includes('Development needed')) {
    return 'You still have pieces on their starting squares. Develop your knights and bishops before launching any attacks. Each undeveloped piece is a soldier not in the fight.';
  }

  if (themes.includes('Material advantage')) {
    return 'You have a material advantage! Consider trading pieces to simplify the position — the fewer pieces on the board, the harder it is for your opponent to create counterplay. Head toward an endgame where your extra material wins.';
  }

  if (themes.includes('Material deficit')) {
    return 'You\'re behind in material. Avoid trades and look for tactical complications — your best chance is to create threats and put pressure on your opponent. An active position can compensate for missing material.';
  }

  if (themes.includes('Passed pawn')) {
    return 'You have a passed pawn! Support it with your pieces and consider pushing it. A passed pawn is a powerful asset, especially in the endgame — it ties down enemy pieces and can promote if not stopped.';
  }

  if (themes.includes('Open file available')) {
    return 'There\'s an open or semi-open file available. Place a rook on it to maximize its power. Rooks need open lines to be effective — they\'re wasted behind closed pawns.';
  }

  // Game phase advice
  if (moveNum <= 10) {
    return 'Opening phase: Focus on controlling the center with pawns, developing knights and bishops to active squares, and preparing to castle. Don\'t move the same piece twice unless there\'s a strong reason.';
  }
  if (moveNum <= 25) {
    return 'Middlegame: Look for your worst-placed piece and find a better square for it. Create threats while keeping your position solid. Ask yourself: what is my opponent\'s plan, and can I prevent it while improving my own position?';
  }
  return 'Endgame: Activate your king — it\'s a strong piece now! Push passed pawns, centralize your pieces, and look for ways to create new passed pawns. Every tempo matters.';
}

// Get valid moves for a specific square
export function getValidMoves(game: Chess, square: Square): Square[] {
  const moves = game.moves({ square, verbose: true });
  return moves.map(m => m.to as Square);
}

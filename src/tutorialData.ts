// =============================================
// CHESS TUTORIAL DATA
// =============================================

export interface Lesson {
  id: string;
  title: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: LessonBlock[];
}

export interface LessonBlock {
  type: 'text' | 'diagram' | 'tip' | 'example';
  content: string;
  fen?: string; // For diagram blocks
}

export interface ChessBook {
  title: string;
  author: string;
  year: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  description: string;
  whyRead: string;
  links: { label: string; url: string }[];
}

export interface FamousGame {
  id: string;
  title: string;
  white: string;
  black: string;
  year: number;
  event: string;
  result: string;
  pgn: string;
  description: string;
  keyMoments: { moveIndex: number; comment: string }[];
}

// =============================================
// LESSONS
// =============================================

export const lessons: Lesson[] = [
  // --- BEGINNER: PIECES ---
  {
    id: 'pieces-king',
    title: 'The King',
    category: 'Pieces & Movement',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'The King is the most important piece on the board. If your King is checkmated, you lose the game. The King can move one square in any direction: horizontally, vertically, or diagonally.' },
      { type: 'diagram', content: 'The King on e4 can move to d3, d4, d5, e3, e5, f3, f4, or f5.', fen: '8/8/8/8/4K3/8/8/8 w - - 0 1' },
      { type: 'tip', content: 'The King cannot move to a square that is attacked by an opponent\'s piece. This means two Kings can never stand next to each other.' },
      { type: 'text', content: 'Special move: Castling. The King can castle with either rook once per game, provided: neither the King nor the rook has moved, there are no pieces between them, the King is not in check, and the King does not pass through or land on an attacked square.' },
      { type: 'text', content: 'Kingside castling (O-O): The King moves two squares toward the h-rook, and the rook jumps to the other side. Queenside castling (O-O-O): The King moves two squares toward the a-rook.' },
      { type: 'tip', content: 'Castle early! It gets your King to safety and brings your rook into the game. Most strong players castle within the first 10 moves.' },
    ],
  },
  {
    id: 'pieces-queen',
    title: 'The Queen',
    category: 'Pieces & Movement',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'The Queen is the most powerful piece. She combines the movement of the Rook and Bishop, moving any number of squares in a straight line: horizontally, vertically, or diagonally.' },
      { type: 'diagram', content: 'The Queen on d4 controls the entire d-file, 4th rank, and both diagonals.', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1' },
      { type: 'text', content: 'The Queen is worth approximately 9 points (pawns). Losing your Queen without compensation is usually decisive.' },
      { type: 'tip', content: 'Don\'t bring your Queen out too early! In the opening, the Queen can become a target for your opponent\'s minor pieces, causing you to waste moves retreating.' },
      { type: 'example', content: 'A common beginner mistake: 1.e4 e5 2.Qh5?! — While this threatens Qxe5 and Scholar\'s Mate (Qxf7#), an experienced player will gain time by developing pieces that attack the Queen.' },
    ],
  },
  {
    id: 'pieces-rook',
    title: 'The Rook',
    category: 'Pieces & Movement',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'The Rook moves any number of squares along a rank (row) or file (column). It cannot jump over pieces. The Rook is worth approximately 5 points.' },
      { type: 'diagram', content: 'The Rook on d4 controls the entire d-file and 4th rank.', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1' },
      { type: 'text', content: 'Two Rooks working together (called "doubled rooks" when on the same file or "connected rooks" on the same rank) are extremely powerful, often worth more than a Queen.' },
      { type: 'tip', content: 'Place your rooks on open files (files with no pawns) or semi-open files (files with only enemy pawns). Rooks on the 7th rank (2nd rank for Black) are devastating because they attack pawns and trap the enemy King.' },
      { type: 'example', content: 'The "pig on the 7th" — a Rook on the 7th rank can gobble up pawns and restrict the opposing King to the back rank.' },
    ],
  },
  {
    id: 'pieces-bishop',
    title: 'The Bishop',
    category: 'Pieces & Movement',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'The Bishop moves any number of squares diagonally. Each player starts with two Bishops — one on light squares and one on dark squares. A Bishop always stays on its original color. The Bishop is worth approximately 3 points.' },
      { type: 'diagram', content: 'The Bishop on c4 controls the a2-g8 and a6-f1 diagonals.', fen: '8/8/8/8/2B5/8/8/8 w - - 0 1' },
      { type: 'text', content: 'The "Bishop pair" (having both Bishops when your opponent doesn\'t) is a significant advantage, especially in open positions. Two Bishops can cover both colors and work together over long diagonals.' },
      { type: 'tip', content: 'Bishops are strongest in open positions with few pawns blocking their diagonals. Try to keep the position open when you have the Bishop pair.' },
    ],
  },
  {
    id: 'pieces-knight',
    title: 'The Knight',
    category: 'Pieces & Movement',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'The Knight moves in an "L" shape: two squares in one direction, then one square perpendicular (or vice versa). The Knight is the only piece that can jump over other pieces. It is worth approximately 3 points.' },
      { type: 'diagram', content: 'A Knight on e4 can move to c3, c5, d2, d6, f2, f6, g3, or g5.', fen: '8/8/8/8/4N3/8/8/8 w - - 0 1' },
      { type: 'text', content: 'Knights are strongest in closed positions (many pawns blocking the center). They can jump over pawns while Bishops get blocked. Knights are also excellent at creating forks — attacking two or more pieces at once.' },
      { type: 'tip', content: 'A Knight on the rim is dim! Knights are much weaker on the edge of the board (controlling only 2-4 squares) compared to the center (controlling 8 squares). Try to keep your Knights centralized.' },
      { type: 'example', content: 'The "smothered mate" is a beautiful pattern: A Knight delivers checkmate while the enemy King is surrounded by its own pieces and cannot escape. For example: King on g8, Rook on f8, pawns on g7 and h7, with a Knight delivering check from f7.' },
    ],
  },
  {
    id: 'pieces-pawn',
    title: 'The Pawn',
    category: 'Pieces & Movement',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'Pawns move forward one square, but capture diagonally. On their first move, pawns can advance two squares. Pawns are worth 1 point, but their structure determines the character of the entire game.' },
      { type: 'diagram', content: 'Pawns in the starting position. White\'s pawns move up, Black\'s move down.', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
      { type: 'text', content: 'Special moves:\n\n1. En passant: If a pawn advances two squares and lands beside an enemy pawn, the enemy pawn can capture it as if it had moved only one square. This must be done immediately.\n\n2. Promotion: When a pawn reaches the opposite end of the board, it must be promoted to a Queen, Rook, Bishop, or Knight. Most players choose a Queen.' },
      { type: 'tip', content: 'Pawns can\'t move backward! Every pawn move is permanent, so think carefully. Pawn structure (the arrangement of your pawns) is one of the most important strategic concepts in chess.' },
      { type: 'text', content: 'Key pawn structures to know:\n\n- Isolated pawn: A pawn with no friendly pawns on adjacent files (weakness)\n- Doubled pawns: Two pawns of the same color on the same file (usually weak)\n- Passed pawn: A pawn with no enemy pawns blocking or guarding its path to promotion (very strong)\n- Pawn chain: Diagonal row of connected pawns (strong but the base can be attacked)' },
    ],
  },

  // --- BEGINNER: FUNDAMENTALS ---
  {
    id: 'basics-checkmate',
    title: 'Check, Checkmate & Stalemate',
    category: 'Fundamentals',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'Check: When your King is attacked by an opponent\'s piece, you are "in check." You MUST get out of check on your next move. There are three ways:\n\n1. Move the King to a safe square\n2. Block the check with another piece\n3. Capture the attacking piece' },
      { type: 'text', content: 'Checkmate: When your King is in check and there is no legal way to escape, it is checkmate — the game is over! The player who delivers checkmate wins.' },
      { type: 'diagram', content: 'Back rank mate: The Rook on e8 delivers checkmate. The King on g1 is blocked by its own pawns.', fen: '4R2k/5ppp/8/8/8/8/8/6K1 w - - 0 1' },
      { type: 'text', content: 'Stalemate: If a player is NOT in check but has no legal moves, the game is a draw by stalemate. This is an important rule — if you\'re winning, be careful not to accidentally stalemate your opponent!' },
      { type: 'diagram', content: 'Stalemate! It\'s Black\'s turn but the King has no legal moves and is NOT in check. The game is a draw.', fen: '7k/5K2/6Q1/8/8/8/8/8 b - - 0 1' },
      { type: 'tip', content: 'Always check for stalemate when you\'re winning with a big advantage. Many games have been drawn because the winning side carelessly stalemated their opponent.' },
    ],
  },
  {
    id: 'basics-opening-principles',
    title: 'Opening Principles',
    category: 'Fundamentals',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'The opening is the first phase of the game (roughly the first 10-15 moves). You don\'t need to memorize opening theory to play well — just follow these core principles:' },
      { type: 'text', content: '1. Control the center: Place pawns and pieces on or aimed at the central squares (d4, d5, e4, e5). The center is the most important area of the board — pieces in the center control the most squares.' },
      { type: 'text', content: '2. Develop your pieces: Get your Knights and Bishops off the back rank and into active positions. Each move should contribute to development. Don\'t move the same piece twice without a good reason.' },
      { type: 'text', content: '3. Castle early: Get your King to safety, usually by castling kingside within the first 7-10 moves. An uncastled King in the center is vulnerable to attacks.' },
      { type: 'text', content: '4. Connect your rooks: Once you\'ve developed all your minor pieces and castled, your Rooks should be able to "see" each other along the back rank. This completes your development.' },
      { type: 'tip', content: 'Don\'t bring your Queen out too early, don\'t move pawns unnecessarily on the flanks, and don\'t chase pawns at the expense of development. Time (tempo) is crucial in the opening!' },
      { type: 'example', content: 'A model opening for White: 1.e4 e5 2.Nf3 Nc6 3.Bb5 (Ruy Lopez) — White controls the center, develops pieces actively, and prepares to castle. This opening has been played at the highest level for centuries.' },
    ],
  },
  {
    id: 'basics-piece-values',
    title: 'Piece Values & Exchanges',
    category: 'Fundamentals',
    difficulty: 'beginner',
    content: [
      { type: 'text', content: 'Understanding relative piece values is essential for making good exchanges:\n\n- Pawn = 1 point\n- Knight = 3 points\n- Bishop = 3 points (slightly more than a Knight in most positions)\n- Rook = 5 points\n- Queen = 9 points\n- King = invaluable (the game!)' },
      { type: 'text', content: 'Exchange guidelines:\n\n- Trading a Knight for a Bishop (or vice versa) is roughly equal\n- A Rook for a minor piece (Knight or Bishop) is called "winning the exchange" — it\'s good for you\n- A Queen for two Rooks is roughly equal\n- Three minor pieces are usually stronger than a Queen\n- Two Bishops (the "Bishop pair") have a small advantage over Bishop + Knight or two Knights' },
      { type: 'tip', content: 'These values are guidelines, not rules! A Knight on a beautiful outpost can be worth more than a passive Rook stuck behind its own pawns. Always consider the specific position.' },
      { type: 'text', content: 'When to exchange pieces:\n\n- Exchange when you\'re ahead in material (simplify toward an endgame)\n- Exchange your opponent\'s active pieces\n- Avoid trading when you\'re behind — keep pieces on for counterplay\n- Exchange the defender of a key square you want to control' },
    ],
  },

  // --- INTERMEDIATE: TACTICS ---
  {
    id: 'tactics-forks',
    title: 'Forks (Double Attacks)',
    category: 'Tactics',
    difficulty: 'intermediate',
    content: [
      { type: 'text', content: 'A fork is when one piece attacks two or more enemy pieces simultaneously. The opponent can only save one piece, so you win material. Every piece can fork, but Knight forks are the most common and devastating because Knights can jump over pieces.' },
      { type: 'diagram', content: 'Knight fork! The Knight on c7 attacks both the King on e8 and the Rook on a8. Black must move the King, and White captures the Rook.', fen: 'r3k3/2N5/8/8/8/8/8/4K3 w - - 0 1' },
      { type: 'text', content: 'Types of forks:\n\n- Knight fork: The most classic. Look for opportunities to place your Knight where it attacks the King and Queen, King and Rook, or Queen and Rook.\n- Pawn fork: A pawn attacking two pieces diagonally. Especially strong because a 1-point pawn may win a 3 or 5-point piece.\n- Queen fork: The Queen\'s wide range makes her excellent at forking distant pieces.\n- Bishop/Rook forks: Less common but still powerful.' },
      { type: 'tip', content: 'To find forks: Look at where your Knight could land. Can it check the King and attack another piece? If a fork isn\'t available now, can you set one up by driving enemy pieces to the right squares first?' },
      { type: 'example', content: 'The "family fork": A Knight checks the King and simultaneously attacks both the Queen and a Rook. This wins at least a Queen since the opponent must deal with the check first.' },
    ],
  },
  {
    id: 'tactics-pins-skewers',
    title: 'Pins & Skewers',
    category: 'Tactics',
    difficulty: 'intermediate',
    content: [
      { type: 'text', content: 'A pin is when a piece attacks an enemy piece that cannot or should not move because a more valuable piece stands behind it on the same line. Only Bishops, Rooks, and Queens can create pins.' },
      { type: 'text', content: 'Two types of pins:\n\n- Absolute pin: The piece behind is the King, so the pinned piece LEGALLY cannot move. Example: Bishop pins a Knight to the King.\n- Relative pin: The piece behind is valuable (like a Queen) but the pinned piece can technically move (though it would be a bad idea).' },
      { type: 'diagram', content: 'Absolute pin: The Bishop on b5 pins the Knight on c6 to the King on e8. The Knight cannot move.', fen: 'r2qkbnr/pppppppp/2n5/1B6/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 1' },
      { type: 'text', content: 'A skewer is the reverse of a pin: A piece attacks a valuable enemy piece, and when that piece moves, a less valuable piece behind it gets captured. Think of it as a "reverse pin."' },
      { type: 'tip', content: 'When your piece is pinned, look for ways to break the pin: Move the piece behind out of the line, block the pin with another piece, or counter-attack the pinning piece.' },
    ],
  },
  {
    id: 'tactics-discovered-attacks',
    title: 'Discovered Attacks & Double Check',
    category: 'Tactics',
    difficulty: 'intermediate',
    content: [
      { type: 'text', content: 'A discovered attack occurs when you move a piece, unmasking an attack by another piece behind it. The moved piece can threaten something on its own, creating two threats simultaneously.' },
      { type: 'text', content: 'Discovered check is when the unmasked attack is a check. This is extra powerful because the opponent must address the check, allowing your moved piece to wreak havoc elsewhere.' },
      { type: 'text', content: 'Double check is when BOTH the moved piece and the unmasked piece give check simultaneously. This is the most forcing move in chess — the opponent MUST move the King since you can\'t block or capture two checking pieces at once.' },
      { type: 'tip', content: 'When you see a piece lined up behind another on the same rank, file, or diagonal, look for discovered attack opportunities. The "moving" piece should create its own threat (capture something, give check, or attack a valuable piece).' },
      { type: 'example', content: 'A classic pattern: White has a Bishop on c1 behind a Knight on d2, with the Bishop aimed at h6 near Black\'s castled King. Moving the Knight to e4 or f3 creates a discovered attack on h6, potentially devastating.' },
    ],
  },

  // --- INTERMEDIATE: STRATEGY ---
  {
    id: 'strategy-pawn-structure',
    title: 'Pawn Structure & Planning',
    category: 'Strategy',
    difficulty: 'intermediate',
    content: [
      { type: 'text', content: 'Pawn structure is the skeleton of your position. Since pawns can\'t move backward, every pawn move has lasting consequences. Your pawn structure often determines the correct piece placement and long-term plans.' },
      { type: 'text', content: 'Key pawn weaknesses:\n\n- Isolated pawn: No friendly pawns on adjacent files. It can\'t be protected by another pawn and must be defended by pieces. The square in front of an isolated pawn is a great outpost for your opponent.\n\n- Backward pawn: A pawn that can\'t advance because the square in front is controlled by enemy pawns, and it can\'t be protected by adjacent pawns. Similar weakness to an isolated pawn.\n\n- Doubled pawns: Two pawns of the same color on one file. They block each other and are harder to defend. However, doubled pawns can sometimes be useful if they control key squares.' },
      { type: 'text', content: 'Pawn strengths:\n\n- Passed pawn: No enemy pawns can stop it from promoting. Passed pawns are extremely powerful in endgames.\n- Connected passed pawns: Two passed pawns side by side are nearly unstoppable.\n- Pawn majority: Having more pawns on one side of the board means you can create a passed pawn there.' },
      { type: 'tip', content: 'Study the pawn structure before making a plan. Ask: Where are the weaknesses? Where should my pieces go? Which side should I play on? The pawn structure gives you the answer.' },
    ],
  },
  {
    id: 'strategy-middlegame',
    title: 'Middlegame Planning',
    category: 'Strategy',
    difficulty: 'intermediate',
    content: [
      { type: 'text', content: 'The middlegame begins when both sides have completed development (usually around move 15). Unlike the opening (where principles guide you) and the endgame (where technique matters), the middlegame requires creative thinking and planning.' },
      { type: 'text', content: 'How to form a plan:\n\n1. Assess the position: Who has the better pieces? Where are the weaknesses? Which side of the board offers the best chances?\n\n2. Identify targets: Look for weak pawns, exposed Kings, poorly placed pieces.\n\n3. Improve your worst piece: Find your least active piece and figure out how to make it better.\n\n4. Coordinate your pieces: Pieces working together are much stronger than pieces working alone. Aim to control key squares, files, and diagonals with multiple pieces.' },
      { type: 'text', content: 'Attack vs. Defense:\n\n- Attack where you\'re stronger (usually the side of the board where you have more pawns or better-placed pieces)\n- Create weaknesses in your opponent\'s camp before attacking\n- Prophylaxis: Ask "what does my opponent want to do?" and prevent it\n- Don\'t attack prematurely — prepare first, then strike' },
      { type: 'tip', content: 'A bad plan is better than no plan at all! If you\'re unsure what to do, improve your worst-placed piece, trade off your opponent\'s good pieces, or advance your pawn majority.' },
    ],
  },

  // --- INTERMEDIATE: ENDGAME ---
  {
    id: 'endgame-king-pawn',
    title: 'King & Pawn Endgames',
    category: 'Endgames',
    difficulty: 'intermediate',
    content: [
      { type: 'text', content: 'King and pawn endgames are the foundation of all endgames. Even complex Rook or piece endgames can simplify into King and pawn positions, so understanding these is crucial.' },
      { type: 'text', content: 'The Rule of the Square: Can a King catch a passed pawn? Draw a mental square from the pawn to its promotion square. If the opposing King can step into this square, it can catch the pawn.' },
      { type: 'text', content: 'Opposition: When two Kings face each other with one square between them, the player who does NOT have to move has "the opposition." This is a huge advantage in King and pawn endgames because it means you can outflank the opposing King.' },
      { type: 'diagram', content: 'White has the opposition (it\'s Black\'s turn). Black must move aside, allowing White\'s King to advance.', fen: '8/8/4k3/8/4K3/8/4P3/8 b - - 0 1' },
      { type: 'text', content: 'Key King and Pawn principles:\n\n- Advance your King first, then your pawns\n- The King must be IN FRONT of its pawn to win (not behind it)\n- With King on the 6th rank in front of the pawn, it\'s always a win\n- Knight pawns (b and g files) and Rook pawns (a and h files) have special drawing tendencies' },
      { type: 'tip', content: 'In any endgame, activate your King! The King is a fighting piece in the endgame — it should be centralized and actively participating, unlike in the middlegame where it hides.' },
    ],
  },
  {
    id: 'endgame-rook',
    title: 'Rook Endgames',
    category: 'Endgames',
    difficulty: 'intermediate',
    content: [
      { type: 'text', content: 'Rook endgames are by far the most common endgame type, occurring in about 50% of all games that reach an endgame. Mastering them will improve your results dramatically.' },
      { type: 'text', content: 'The Lucena Position: The most important winning position to know. If you have a Rook and pawn vs. Rook, and your King is on the promotion square with the pawn on the 7th rank, you win using the "bridge building" technique:\n\n1. Push the enemy King away with your Rook\n2. Bring your King out\n3. Block the enemy Rook\'s checks with your own Rook (the "bridge")' },
      { type: 'text', content: 'The Philidor Position: The most important defensive position. If you\'re defending with Rook vs. Rook and pawn, keep your Rook on the 6th rank (to cut off the enemy King), and once the pawn advances to the 6th rank, go to the back rank and check from behind.' },
      { type: 'text', content: 'General Rook endgame principles:\n\n- Rooks belong behind passed pawns (yours or your opponent\'s)\n- Keep your Rook active — a passive Rook loses games\n- Cut off the enemy King from the passed pawn\n- The 7th rank is paradise for a Rook' },
      { type: 'tip', content: 'Learn the Lucena and Philidor positions cold. They are the building blocks of all Rook endgames, and knowing them will guide your decisions throughout the game.' },
    ],
  },

  // --- ADVANCED ---
  {
    id: 'advanced-positional-play',
    title: 'Positional Chess & Prophylaxis',
    category: 'Advanced Concepts',
    difficulty: 'advanced',
    content: [
      { type: 'text', content: 'Positional chess is about long-term advantages rather than immediate tactical gains. While tactics win the battle, strategy wins the war. The great positional players — Capablanca, Karpov, Carlsen — grind down opponents through the accumulation of small advantages.' },
      { type: 'text', content: 'Key positional concepts:\n\n- Weak squares: Squares that can no longer be defended by pawns. These become permanent outposts for enemy pieces, especially Knights.\n\n- Good vs. bad Bishop: A Bishop blocked by its own pawns (on the same color) is "bad." A Bishop with open diagonals and pawns on the opposite color is "good."\n\n- Space advantage: Having pawns further advanced gives your pieces more room to maneuver. But overextension can leave weaknesses behind.\n\n- Piece activity: The most active piece often determines who has the advantage. A Rook on an open file or a Knight on a central outpost can dominate.' },
      { type: 'text', content: 'Prophylaxis (Nimzowitsch\'s concept): Before executing your own plan, ask "What does my opponent want to do?" and prevent it. The best moves often serve a dual purpose — improving your position while restricting your opponent\'s options. This is the hallmark of world-class play.' },
      { type: 'tip', content: 'Don\'t rush! In quiet positions, improve your pieces one at a time. When your pieces are all on their best squares and your opponent has no good moves, only then should you look for the decisive breakthrough.' },
    ],
  },
  {
    id: 'advanced-calculation',
    title: 'Calculation & Visualization',
    category: 'Advanced Concepts',
    difficulty: 'advanced',
    content: [
      { type: 'text', content: 'Calculation is the ability to see ahead — to play out a sequence of moves in your mind and evaluate the resulting position. It\'s the most concrete skill in chess and separates good players from great ones.' },
      { type: 'text', content: 'How to calculate effectively:\n\n1. Identify candidate moves: Don\'t calculate every possible move. Focus on 2-4 most promising moves (checks, captures, threats).\n\n2. Calculate forcing sequences first: Checks, captures, and threats must be dealt with. These narrow the tree of possibilities.\n\n3. Use the "tree method": Analyze one line fully before moving to the next. Don\'t jump between variations or you\'ll get confused.\n\n4. Evaluate the final position: At the end of your calculation, assess who stands better and why.' },
      { type: 'text', content: 'Common calculation pitfalls:\n\n- "Phantom moves": Imagining a piece is on a square where it no longer exists because you calculated it was captured.\n- Stopping too early: Not seeing your opponent\'s defensive resource.\n- Tunnel vision: Getting fixated on one line and missing a better alternative.\n- Assuming: "He wouldn\'t play that!" — always check your opponent\'s best reply.' },
      { type: 'tip', content: 'Practice with puzzle books and online tactics trainers. Start with 1-2 move puzzles and work your way up. Doing 10-15 minutes of puzzles daily will dramatically improve your calculation.' },
    ],
  },
  {
    id: 'advanced-openings',
    title: 'Opening Repertoire Building',
    category: 'Advanced Concepts',
    difficulty: 'advanced',
    content: [
      { type: 'text', content: 'Once you understand the fundamentals, building an opening repertoire helps you get good positions consistently. A repertoire is a set of openings you know well and play regularly.' },
      { type: 'text', content: 'Building your repertoire:\n\n1. Choose openings that fit your style:\n   - Aggressive players: 1.e4 as White, Sicilian as Black\n   - Positional players: 1.d4 as White, Queen\'s Gambit Declined as Black\n   - Universal: 1.Nf3 or English as White\n\n2. Start with main lines, not sidelines. Understanding the key plans and typical middlegame positions is more important than memorizing 20 moves of theory.\n\n3. Focus on understanding OVER memorization. If you understand why moves are played, you\'ll find good moves even when your preparation runs out.' },
      { type: 'text', content: 'Recommended openings for improving players:\n\nAs White:\n- Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4): Classical development, easy to understand\n- London System (1.d4 2.Bf4): Solid, low-theory system you can play against anything\n\nAs Black:\n- Caro-Kann (1.e4 c6): Solid, sound pawn structure, easy to learn\n- Queen\'s Gambit Declined (1.d4 d5 2.c4 e6): Classical and reliable\n- Nimzo-Indian (1.d4 Nf6 2.c4 e6 3.Nc3 Bb4): Rich strategic play' },
      { type: 'tip', content: 'Don\'t spend too much time on openings below 2000 rating. Focus on tactics, endgames, and middlegame understanding — these will improve your results much more than memorizing 25 moves of the Najdorf Sicilian.' },
    ],
  },
];

// =============================================
// CHESS BOOKS
// =============================================

export const chessBooks: ChessBook[] = [
  // BEGINNER
  {
    title: 'Bobby Fischer Teaches Chess',
    author: 'Bobby Fischer, Stuart Margulies & Don Mosenfelder',
    year: 1966,
    level: 'beginner',
    category: 'Fundamentals',
    description: 'A programmed learning approach to chess basics, focusing on checkmate patterns. Written by one of the greatest players ever, it uses a unique interactive format where you solve problems and check your answers.',
    whyRead: 'The best first chess book ever written. It teaches pattern recognition for checkmates in an engaging, self-paced format. Even if you already know the rules, the checkmate patterns here will immediately improve your game.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Bobby-Fischer-Teaches-Chess/dp/0553263153' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/228676.Bobby_Fischer_Teaches_Chess' },
    ],
  },
  {
    title: 'Chess Fundamentals',
    author: 'Jose Raul Capablanca',
    year: 1921,
    level: 'beginner',
    category: 'Fundamentals',
    description: 'Written by the third World Champion, known for his crystal-clear playing style. Covers basic endgames, middlegame principles, and general strategy in a remarkably clear way.',
    whyRead: 'Capablanca was famous for making chess look easy. This book does the same for learning — it breaks down complex ideas into simple, digestible concepts. A must-read for anyone serious about improvement.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Chess-Fundamentals-Jose-Raul-Capablanca/dp/0486461882' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85149.Chess_Fundamentals' },
      { label: 'Free PDF (public domain)', url: 'https://www.gutenberg.org/ebooks/33870' },
    ],
  },
  {
    title: 'The Steps Method (Steps 1-3)',
    author: 'Rob Brunia & Cor van Wijgerden',
    year: 1987,
    level: 'beginner',
    category: 'Training',
    description: 'A systematic curriculum used in Dutch chess education. Thousands of exercises organized by theme and difficulty, covering basic tactics, checkmate patterns, and elementary endgames.',
    whyRead: 'The gold standard for structured chess training. If you do one thing to improve, solve these exercises. The systematic progression ensures no gaps in your tactical foundation.',
    links: [
      { label: 'Official Site', url: 'https://www.stappenmethode.nl/en/' },
      { label: 'Amazon', url: 'https://www.amazon.com/Steps-Method-Workbook-Step/dp/9077275347' },
    ],
  },
  {
    title: 'Logical Chess: Move by Move',
    author: 'Irving Chernev',
    year: 1957,
    level: 'beginner',
    category: 'Game Collections',
    description: '33 complete games where every single move by both sides is explained. Covers openings, middlegame plans, tactics, and endgames in the context of real games.',
    whyRead: 'Unlike most books that only explain key moments, Chernev explains every move. This teaches you how to think throughout the entire game — invaluable for beginners who wonder "what should I do now?"',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Logical-Chess-Every-Explained-Algebraic/dp/0713484640' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85117.Logical_Chess_Move_by_Move' },
    ],
  },

  // INTERMEDIATE
  {
    title: 'My System',
    author: 'Aron Nimzowitsch',
    year: 1925,
    level: 'intermediate',
    category: 'Strategy',
    description: 'The foundational text of modern positional chess. Introduces concepts like overprotection, prophylaxis, blockade, and the restrained center. Nimzowitsch\'s ideas revolutionized how chess is played.',
    whyRead: 'One of the most influential chess books ever written. It gives you a vocabulary and framework for understanding positional play. After reading this, you\'ll see chess differently — you\'ll understand WHY pieces go on certain squares.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/My-System-21st-Century-Aron-Nimzowitsch/dp/1880673851' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85127.My_System' },
    ],
  },
  {
    title: 'How to Reassess Your Chess',
    author: 'Jeremy Silman',
    year: 1993,
    level: 'intermediate',
    category: 'Strategy',
    description: 'Teaches the concept of "imbalances" — the differences between your position and your opponent\'s. Minor piece battle, pawn structure, space, material, development, and initiative are all covered systematically.',
    whyRead: 'This book teaches you how to THINK about chess positions. Instead of randomly looking for moves, you learn to identify what\'s different about the position and form plans accordingly. A paradigm shift for most players.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/How-Reassess-Your-Chess-Imbalances/dp/1890085138' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85130.How_to_Reassess_Your_Chess' },
    ],
  },
  {
    title: 'Dvoretsky\'s Endgame Manual',
    author: 'Mark Dvoretsky',
    year: 2003,
    level: 'intermediate',
    category: 'Endgames',
    description: 'The most comprehensive and respected endgame book. Covers all major endgame types with theoretical positions, practical examples, and exercises. Organized by endgame type for easy reference.',
    whyRead: 'Endgame knowledge gives you confidence throughout the game. You\'ll know which positions are winning, which are drawn, and what to aim for when simplifying. This is the book endorsed by virtually every GM.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Dvoretskys-Endgame-Manual-Mark-Dvoretsky/dp/1949859185' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85163.Dvoretsky_s_Endgame_Manual' },
    ],
  },
  {
    title: '1001 Chess Exercises for Beginners',
    author: 'Franco Masetti & Roberto Messa',
    year: 2012,
    level: 'intermediate',
    category: 'Tactics',
    description: 'Despite the title, this is an excellent workbook for players up to 1600. 1001 carefully selected puzzles organized by tactical theme: forks, pins, skewers, discovered attacks, and more.',
    whyRead: 'Pattern recognition is the single most important skill for improvement below 2000. This book burns common tactical patterns into your brain through repetition. Do it once, then do it again faster.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/1001-Chess-Exercises-Beginners-Recognition/dp/9056913980' },
      { label: 'New In Chess', url: 'https://www.newinchess.com/1001-chess-exercises-for-beginners' },
    ],
  },
  {
    title: 'The Art of Attack in Chess',
    author: 'Vladimir Vukovic',
    year: 1963,
    level: 'intermediate',
    category: 'Attack',
    description: 'A systematic study of attacking play against the castled King. Covers sacrifices on h7, f7, g7, attacks with opposite-side castling, and the logic behind piece sacrifices.',
    whyRead: 'This book teaches you how to attack properly — not randomly throwing pieces at the King, but building up an attack systematically. Understanding these patterns will win you many games.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Art-Attack-Chess-Vladimir-Vukovic/dp/1857444000' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85134.The_Art_of_Attack_in_Chess' },
    ],
  },

  // ADVANCED
  {
    title: 'Zurich 1953',
    author: 'David Bronstein',
    year: 1956,
    level: 'advanced',
    category: 'Game Collections',
    description: 'All 210 games from the 1953 Candidates Tournament, annotated by one of the participants. Bronstein provides deep, honest annotations that reveal the thought process of world-class players.',
    whyRead: 'Considered by many GMs to be the greatest chess book ever written. Bronstein shares how top players actually think during a game — including doubts, mistakes, and creative insights. Reading this is like sitting next to a genius.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Zurich-International-Chess-Tournament-1953/dp/0486238008' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85144.Zurich_International_Chess_Tournament_1953' },
    ],
  },
  {
    title: 'My 60 Memorable Games',
    author: 'Bobby Fischer',
    year: 1969,
    level: 'advanced',
    category: 'Game Collections',
    description: '60 of Fischer\'s best games, annotated by the legend himself with brutal honesty. Fischer critiques his own moves as harshly as his opponents\'. Includes games against every top player of his era.',
    whyRead: 'Fischer\'s annotations are uniquely precise and instructive. He shows you what he was thinking, where he considered alternatives, and what his opponents missed. This is chess at its purest — no excuses, just truth.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/My-Memorable-Games-Bobby-Fischer/dp/190638830X' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85089.My_60_Memorable_Games' },
    ],
  },
  {
    title: 'Think Like a Grandmaster',
    author: 'Alexander Kotov',
    year: 1971,
    level: 'advanced',
    category: 'Thinking',
    description: 'The classic treatise on chess thinking methodology. Introduces the "tree of analysis" concept and teaches disciplined calculation: identify candidate moves, analyze each systematically, evaluate the final position.',
    whyRead: 'If you struggle with calculation or frequently miss tactics, this book provides a structured method for thinking during a game. The candidate moves concept alone is worth the read.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Think-Like-Grandmaster-Batsford-Chess/dp/0713484349' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85146.Think_Like_a_Grandmaster' },
    ],
  },
  {
    title: 'Endgame Strategy',
    author: 'Mikhail Shereshevsky',
    year: 1985,
    level: 'advanced',
    category: 'Endgames',
    description: 'Focuses on the transition from middlegame to endgame and practical endgame play. Covers piece activity, pawn structure in endgames, the principle of two weaknesses, and technique.',
    whyRead: 'Where Dvoretsky is theoretical, Shereshevsky is practical. This book teaches you how to convert middlegame advantages into won endgames — the hallmark of a strong player. Capablanca, Karpov, and Carlsen all excelled at this.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Endgame-Strategy-Mikhail-Shereshevsky/dp/1857440633' },
      { label: 'Goodreads', url: 'https://www.goodreads.com/book/show/85162.Endgame_Strategy' },
    ],
  },
  {
    title: 'Positional Decision Making in Chess',
    author: 'Boris Gelfand',
    year: 2015,
    level: 'advanced',
    category: 'Strategy',
    description: 'Former World Championship challenger Boris Gelfand shares his approach to positional play, focusing on critical moments where the character of the position changes. Deeply annotated games from his own practice.',
    whyRead: 'Modern positional play explained by a modern super-GM. Gelfand bridges classical concepts with contemporary understanding, making this essential reading for ambitious players.',
    links: [
      { label: 'Amazon', url: 'https://www.amazon.com/Positional-Decision-Making-Chess-Gelfand/dp/1784830054' },
      { label: 'Quality Chess', url: 'https://www.qualitychess.co.uk/products/2/267/positional_decision_making_in_chess_by_boris_gelfand/' },
    ],
  },
];

// =============================================
// FAMOUS GM GAMES
// =============================================

export const famousGames: FamousGame[] = [
  {
    id: 'immortal',
    title: 'The Immortal Game',
    white: 'Adolf Anderssen',
    black: 'Lionel Kieseritzky',
    year: 1851,
    event: 'London (Casual Game)',
    result: '1-0',
    pgn: '1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7#',
    description: 'The most famous chess game ever played. Anderssen sacrifices both Rooks, a Bishop, and his Queen to deliver a stunning checkmate with just three minor pieces. A masterpiece of romantic-era chess that shows the beauty of sacrificial play.',
    keyMoments: [
      { moveIndex: 2, comment: 'The King\'s Gambit — White sacrifices a pawn for rapid development and an attack on f7.' },
      { moveIndex: 16, comment: 'Nd5! A powerful centralization. White has sacrificed material but has a massive lead in development.' },
      { moveIndex: 18, comment: 'Bd6!! An incredible move. White offers the Rook on g1 to cut off Black\'s King.' },
      { moveIndex: 20, comment: 'Now White is down a Queen, both Rooks, and a Bishop — yet the position is winning!' },
      { moveIndex: 22, comment: 'Qf6+!! The Queen sacrifice. After Nxf6, Be7# is checkmate. Three minor pieces deliver the final blow.' },
    ],
  },
  {
    id: 'evergreen',
    title: 'The Evergreen Game',
    white: 'Adolf Anderssen',
    black: 'Jean Dufresne',
    year: 1852,
    event: 'Berlin (Casual Game)',
    result: '1-0',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7#',
    description: 'Another Anderssen masterpiece and one of the most beautiful games ever played. Features a spectacular Queen sacrifice followed by a Bishop-led mating attack. Called "Evergreen" because its beauty never fades.',
    keyMoments: [
      { moveIndex: 6, comment: 'The Evans Gambit — a pawn sacrifice for rapid development, very popular in the 1800s.' },
      { moveIndex: 16, comment: 'Nf6+! The attack begins. This Knight sacrifice opens up Black\'s King position.' },
      { moveIndex: 19, comment: 'Rxe7+!! A stunning Rook sacrifice to deflect the Knight from defending.' },
      { moveIndex: 20, comment: 'Qxd7+!! The Queen sacrifice. White\'s two Bishops will now deliver checkmate.' },
      { moveIndex: 23, comment: 'Bxe7# — checkmate! The two Bishops finish the job. A 170-year-old game that still takes your breath away.' },
    ],
  },
  {
    id: 'opera',
    title: 'The Opera Game',
    white: 'Paul Morphy',
    black: 'Duke of Brunswick & Count Isouard',
    year: 1858,
    event: 'Paris Opera House',
    result: '1-0',
    pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#',
    description: 'Played by Paul Morphy during an opera performance against two consulting amateurs. This game is THE model for how to play the opening: develop pieces rapidly, open lines, and attack before your opponent is ready. Every chess coach uses this game to teach development and initiative.',
    keyMoments: [
      { moveIndex: 5, comment: 'Bc4 — Morphy develops naturally, aiming at the weak f7 square. Simple, strong chess.' },
      { moveIndex: 8, comment: 'Bg5 — Every White piece is developing with tempo (threats). Black is falling behind in development.' },
      { moveIndex: 12, comment: 'Rxd7! Sacrificing the exchange to rip open Black\'s position. Morphy has full development while Black\'s Kingside is stuck.' },
      { moveIndex: 15, comment: 'Qb8+!! The beautiful Queen sacrifice. After Nxb8, Rd8 is checkmate. Development wins the game.' },
    ],
  },
  {
    id: 'kasparov-topalov',
    title: 'Kasparov\'s Immortal',
    white: 'Garry Kasparov',
    black: 'Veselin Topalov',
    year: 1999,
    event: 'Wijk aan Zee (Hoogovens)',
    result: '1-0',
    pgn: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Re1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7',
    description: 'Considered the greatest game of the greatest player. Kasparov sacrifices a Rook and then chases Topalov\'s King from one side of the board to the other in a breathtaking king hunt. The combination starting with 24.Rxd4! was calculated over 15 moves deep.',
    keyMoments: [
      { moveIndex: 23, comment: 'Rxd4!! The stunning Rook sacrifice. Kasparov calculated that Topalov\'s King would be hunted across the entire board.' },
      { moveIndex: 24, comment: 'Re7+! — The second Rook joins the attack. Now the King hunt begins.' },
      { moveIndex: 25, comment: 'Qxd4+ Ka5 — Black\'s King is being driven into the open. Kasparov has seen all the way to the end.' },
      { moveIndex: 26, comment: 'b4+! Ka4 — The King is now in the middle of the board, surrounded by enemy pieces.' },
      { moveIndex: 31, comment: 'Qxa6+! Kxb4 c3+! — The King keeps getting pushed. This combination is 15+ moves long and was all calculated in advance.' },
    ],
  },
  {
    id: 'byrne-fischer',
    title: 'The Game of the Century',
    white: 'Donald Byrne',
    black: 'Bobby Fischer',
    year: 1956,
    event: 'Rosenwald Memorial, New York',
    result: '0-1',
    pgn: '1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qa8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2#',
    description: 'A 13-year-old Bobby Fischer plays a staggering Queen sacrifice against a strong International Master. Fischer\'s combination beginning with 17...Be6!! offers the Queen to unleash a devastating attack. This game announced Fischer as a generational talent and remains one of the most celebrated games in chess history.',
    keyMoments: [
      { moveIndex: 10, comment: 'Na4! — Young Fischer begins his counterattack. The Knight heads to c3 with devastating effect.' },
      { moveIndex: 16, comment: 'Be6!! — The key move. Fischer offers his Queen! If Bxb6, then Bxc4+ leads to a winning attack with the minor pieces.' },
      { moveIndex: 17, comment: 'Bxc4+ — After the Queen is captured, Fischer\'s Bishops and Knights take over the board.' },
      { moveIndex: 19, comment: 'Nxd4+ — A beautiful windmill: the Knight hops around giving check while Black picks up material.' },
      { moveIndex: 40, comment: 'Rc2# — Checkmate! A 13-year-old\'s masterpiece. The game that gave Fischer the title "the Mozart of chess."' },
    ],
  },
  {
    id: 'deep-blue',
    title: 'Man vs. Machine',
    white: 'Deep Blue',
    black: 'Garry Kasparov',
    year: 1996,
    event: 'Philadelphia, Game 1',
    result: '1-0',
    pgn: '1. e4 c5 2. c3 d5 3. exd5 Qxd5 4. d4 Nf6 5. Nf3 Bg4 6. Be2 e6 7. h3 Bh5 8. O-O Nc6 9. Be3 cxd4 10. cxd4 Bb4 11. a3 Ba5 12. Nc3 Qd6 13. Nb5 Qe7 14. Ne5 Bxe2 15. Qxe2 O-O 16. Rac1 Rac8 17. Bg5 Bb6 18. Bxf6 gxf6 19. Nc4 Rfd8 20. Nxb6 axb6 21. Rfd1 f5 22. Qe3 Qf6 23. d5 Rxd5 24. Rxd5 exd5 25. b3 Kh8 26. Qxb6 Rg8 27. Qc5 d4 28. Nd6 f4 29. Nxb7 Ne5 30. Qd5 f3 31. g3 Nd3 32. Rc7 Re8 33. Nd6 Re1+ 34. Kh2 Nxf2 35. Nxf7+ Kg7 36. Ng5+ Kh6 37. Rxh7+',
    description: 'The first game ever won by a computer against a reigning World Champion under tournament conditions. Deep Blue\'s victory in Game 1 shocked the world and marked a turning point in chess history. Though Kasparov won the overall match 4-2, this game showed machines could compete at the highest level.',
    keyMoments: [
      { moveIndex: 17, comment: 'Bxf6! — Deep Blue damages Black\'s Kingside pawn structure, creating long-term weaknesses.' },
      { moveIndex: 22, comment: 'd5! — A strong central break that opens lines and activates White\'s pieces.' },
      { moveIndex: 27, comment: 'Nd6 — The Knight dominates from d6. Deep Blue shows excellent positional understanding.' },
      { moveIndex: 36, comment: 'Rxh7+! — The decisive blow. The machine finishes with clinical precision.' },
    ],
  },
  {
    id: 'carlsen-anand-2013-g5',
    title: 'The Throne Changes Hands',
    white: 'Magnus Carlsen',
    black: 'Viswanathan Anand',
    year: 2013,
    event: 'World Championship, Chennai (Game 5)',
    result: '1-0',
    pgn: '1. c4 e6 2. d4 d5 3. Nc3 c6 4. e4 dxe4 5. Nxe4 Bb4+ 6. Nc3 c5 7. a3 Ba5 8. Nf3 Nf6 9. Be3 Nc6 10. Qd3 cxd4 11. Nxd4 Ng4 12. O-O-O Nxe3 13. fxe3 Bc7 14. Ncb5 Bb8 15. Qh3 Qe7 16. Qg3 O-O 17. Bh6 Ne5 18. Bxg7 Kxg7 19. Nf5+ exf5 20. Nd6 Kh8 21. Nxc8 Rxc8 22. Qf4 Qc7 23. Qxf5 Rg8 24. g3 Qc6 25. Bg2 Qe4 26. Qxe4 fxe4 27. Rhf1 Nd3+ 28. Kd2 Rg5 29. Rf4 Nxb2 30. Rxe4 Rd8+ 31. Ke1 Bc7 32. Be4 Nc4 33. Rf1 Rg7 34. Bc2 Na5 35. Rf4 Nc6 36. Bd3 Nb4 37. Rf2 Nxd3+ 38. Rxd3 Rxd3 39. Kxd3 Bf4 40. Ke4 Bxe3 41. Rf3 Bc1 42. a4 Kg8 43. Rc3 Bf4 44. Rc8+ Kg7 45. Rc5 Be3 46. Re5 Bf4 47. Re8 Kf6 48. Ra8 a5 49. Ra6+ Kf5 50. Kd3 Rg3+ 51. Kc2 Ra3 52. Ra7 h6 53. Rxb7 Rxa4 54. Rb5+ Kg4 55. Rb6 h5 56. Rb8 Be5 57. Rb5 Bf6 58. Kd3 Kf3 59. Rb3+ Kg2 60. Rb5 h4 61. gxh4 Bxh4 62. Rc5 Bf6 63. Ke2 Ra2+ 64. Kf1 Be5 65. Rc8 Bb2 66. Re8 Rc2 67. Re3 a4 68. Ra3 Rxc4',
    description: 'The pivotal game in the 2013 World Championship match. 22-year-old Carlsen ground down the defending champion Anand in a 68-move marathon, demonstrating his legendary endgame technique. This victory gave Carlsen a 3-2 lead and signaled the beginning of a new era in chess.',
    keyMoments: [
      { moveIndex: 17, comment: 'Bxg7! Kxg7 Nf5+ — A piece sacrifice to shatter Black\'s Kingside and win material back with interest.' },
      { moveIndex: 24, comment: 'Qxe4 — Queens come off, and Carlsen steers the game into an endgame where his technique is unmatched.' },
      { moveIndex: 39, comment: 'Ke4! — Carlsen\'s King marches into the center — a fighting piece in the endgame. This is Carlsen\'s trademark: grinding opponents in technical positions.' },
      { moveIndex: 52, comment: 'Rxb7 — The b-pawn falls, and Carlsen converts with precision. Anand\'s fortress crumbles.' },
    ],
  },
  {
    id: 'short-timman',
    title: 'King Walk to Victory',
    white: 'Nigel Short',
    black: 'Jan Timman',
    year: 1991,
    event: 'Tilburg',
    result: '1-0',
    pgn: '1. e4 Nf6 2. e5 Nd5 3. d4 d6 4. Nf3 g6 5. Bc4 Nb6 6. Bb3 Bg7 7. Qe2 Nc6 8. O-O O-O 9. h3 a5 10. a4 dxe5 11. dxe5 Nd4 12. Nxd4 Qxd4 13. Re1 e6 14. Nd2 Nd5 15. Nf3 Qc5 16. Qe4 Qb4 17. Bc4 Nb6 18. b3 Nxc4 19. bxc4 Re8 20. Rd1 Qc5 21. Qh4 b6 22. Be3 Qc6 23. Bh6 Bh8 24. Rd8 Bb7 25. Rad1 Bg7 26. R8d3 Bf8 27. Bxf8 Rxf8 28. Rd6 Qc8 29. Ng5 h5 30. Qg3 Qe8 31. Nxf7 Ba6 32. R1d3 Qf8 33. Nd6 cxd6 34. Rg3 Kh8 35. Rxg6 Rg8 36. Rxd6 Raf8 37. f3 Rxg3 38. Qxg3 Qf4 39. Qxf4 Rxf4 40. Rd7 Kh7 41. Kf1 Kg6 42. Ke1 Kh6 43. Kd2 Kg6 44. Kc3 Re4 45. Kd3 Rf4 46. Ke3 Rf8 47. Ke4 Bb7+ 48. Kd4 Rd8+ 49. Kc5 Rxd7 50. Kxb6 Rd1 51. Kxa5',
    description: 'One of the most extraordinary games in chess history. Short walks his King from g1 all the way to b6 in the endgame, capturing material along the way. The King march Kf1-Ke1-Kd2-Kc3-Kd3-Ke3-Ke4-Kd4-Kc5-Kb6 covers 10 squares and is an unforgettable demonstration of the King as a fighting piece.',
    keyMoments: [
      { moveIndex: 22, comment: 'Bh6! — Short trades the dark-squared Bishops, weakening Black\'s King and dark squares.' },
      { moveIndex: 23, comment: 'Rd8! — The Rooks penetrate deep into Black\'s position.' },
      { moveIndex: 40, comment: 'Kf1! — The King begins its incredible journey. Short sees that the endgame requires his King to march all the way across the board.' },
      { moveIndex: 49, comment: 'Kxb6! — The King arrives at b6, having marched from g1. One of the most famous King walks in chess history.' },
    ],
  },
];

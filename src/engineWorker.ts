// Web Worker wrapper for the chess engine
// All heavy engine work runs here so the UI stays responsive

import { Chess } from 'chess.js';
import { getBestMove, getEnhancedHint, analyzeGame, evaluateBoard } from './engine';

export type WorkerRequest =
  | { type: 'getBestMove'; id: number; fen: string; depth: number }
  | { type: 'getHint'; id: number; fen: string; playerColor: 'w' | 'b' }
  | { type: 'analyzeGame'; id: number; pgn: string }
  | { type: 'evaluateBoard'; id: number; fen: string };

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case 'getBestMove': {
        const game = new Chess(msg.fen);
        const result = getBestMove(game, msg.depth);
        self.postMessage({ id: msg.id, type: msg.type, result });
        break;
      }
      case 'getHint': {
        const game = new Chess(msg.fen);
        const result = getEnhancedHint(game, msg.playerColor);
        self.postMessage({ id: msg.id, type: msg.type, result });
        break;
      }
      case 'analyzeGame': {
        analyzeGame(msg.pgn, (pct) => {
          self.postMessage({ id: msg.id, type: 'analysisProgress', progress: pct });
        }).then(result => {
          self.postMessage({ id: msg.id, type: msg.type, result });
        });
        break;
      }
      case 'evaluateBoard': {
        const game = new Chess(msg.fen);
        const result = evaluateBoard(game);
        self.postMessage({ id: msg.id, type: msg.type, result });
        break;
      }
      default: {
        // Legacy support: plain { fen, depth, id } messages
        const game = new Chess(msg.fen);
        const result = getBestMove(game, msg.depth);
        self.postMessage({ id: msg.id, result });
      }
    }
  } catch (err) {
    self.postMessage({ id: msg.id, type: msg.type, result: null, error: String(err) });
  }
};

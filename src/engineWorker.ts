// Web Worker wrapper for the chess engine
// This runs getBestMove off the main thread so the UI stays responsive

import { Chess } from 'chess.js';
import { getBestMove } from './engine';

self.onmessage = (e: MessageEvent) => {
  const { fen, depth, id } = e.data;
  try {
    const game = new Chess(fen);
    const result = getBestMove(game, depth);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, result: null, error: String(err) });
  }
};

// Hook to communicate with the engine Web Worker
import { useRef, useCallback, useEffect } from 'react';
import type { ScoredMove, EnhancedHint, MoveAnalysis } from './engine';

let workerIdCounter = 0;

type Callback = (result: unknown) => void;

export function useEngineWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<number, Callback>>(new Map());
  const progressRef = useRef<Map<number, (pct: number) => void>>(new Map());

  useEffect(() => {
    const worker = new Worker(
      new URL('./engineWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { id, type, result, progress } = e.data;

      if (type === 'analysisProgress') {
        const onProgress = progressRef.current.get(id);
        if (onProgress) onProgress(progress);
        return;
      }

      const cb = callbacksRef.current.get(id);
      if (cb) {
        callbacksRef.current.delete(id);
        progressRef.current.delete(id);
        cb(result);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const post = useCallback((msg: Record<string, unknown>): Promise<unknown> => {
    return new Promise((resolve) => {
      const id = ++workerIdCounter;
      callbacksRef.current.set(id, resolve);
      workerRef.current?.postMessage({ ...msg, id });
    });
  }, []);

  const computeMove = useCallback((fen: string, depth: number): Promise<ScoredMove | null> => {
    return post({ type: 'getBestMove', fen, depth }) as Promise<ScoredMove | null>;
  }, [post]);

  const computeHint = useCallback((fen: string, playerColor: 'w' | 'b'): Promise<EnhancedHint | null> => {
    return post({ type: 'getHint', fen, playerColor }) as Promise<EnhancedHint | null>;
  }, [post]);

  const computeAnalysis = useCallback((pgn: string, onProgress?: (pct: number) => void): Promise<MoveAnalysis[]> => {
    const id = ++workerIdCounter;
    return new Promise((resolve) => {
      callbacksRef.current.set(id, resolve as Callback);
      if (onProgress) progressRef.current.set(id, onProgress);
      workerRef.current?.postMessage({ type: 'analyzeGame', id, pgn });
    });
  }, []);

  const computeEval = useCallback((fen: string): Promise<number> => {
    return post({ type: 'evaluateBoard', fen }) as Promise<number>;
  }, [post]);

  return { computeMove, computeHint, computeAnalysis, computeEval };
}

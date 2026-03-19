// Hook to communicate with the engine Web Worker
import { useRef, useCallback, useEffect } from 'react';
import type { ScoredMove } from './engine';

let workerIdCounter = 0;

export function useEngineWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<number, (result: ScoredMove | null) => void>>(new Map());

  useEffect(() => {
    const worker = new Worker(
      new URL('./engineWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { id, result } = e.data;
      const cb = callbacksRef.current.get(id);
      if (cb) {
        callbacksRef.current.delete(id);
        cb(result);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const computeMove = useCallback((fen: string, depth: number): Promise<ScoredMove | null> => {
    return new Promise((resolve) => {
      const id = ++workerIdCounter;
      callbacksRef.current.set(id, resolve);
      workerRef.current?.postMessage({ fen, depth, id });
    });
  }, []);

  return { computeMove };
}

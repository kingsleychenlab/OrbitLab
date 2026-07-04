import { useEffect, useRef } from 'react';
import { SceneManager } from './SceneManager';

/**
 * Thin React boundary around the imperative SceneManager. It creates exactly
 * one WebGL scene on mount and hands it to the store via `onReady`; all
 * per-frame work happens inside SceneManager, so this component never re-renders
 * for the simulation. (The app runs without React.StrictMode so the WebGL
 * context is created once — see main.tsx.)
 */
export function Viewport({ onReady }: { onReady: (sm: SceneManager) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current) return;
    const sm = new SceneManager(containerRef.current);
    readyRef.current(sm);
    return () => sm.dispose();
  }, []);

  return <div className="viewport" ref={containerRef} />;
}

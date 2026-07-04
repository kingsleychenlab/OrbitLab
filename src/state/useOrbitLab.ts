import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Simulation,
  Vector3,
  createBody,
  cloneBody,
  type Body,
  type DriftMetrics,
  type HistorySample,
  type IntegratorName,
  type SystemDefinition,
} from '../physics';
import { getPreset, DEFAULT_PRESET_ID } from '../presets';
import type { SceneManager } from '../rendering/SceneManager';
import { DEFAULT_VIEW_OPTIONS, type ViewOptions } from '../rendering/types';
import { downloadText, readFileAsText } from './download';

const PUBLISH_MS = 100; // React panel refresh cadence (10 Hz); 3D runs at 60 fps.

export interface LogEntry {
  id: number;
  message: string;
  kind: 'info' | 'event' | 'warn';
  simTime: number | null;
}

export interface SelectedReadout {
  position: Vector3;
  velocity: Vector3;
  speed: number;
  distanceFromOrigin: number;
}

const NEW_BODY_COLORS = ['#7cd3ff', '#ffd166', '#a685ff', '#5ce6a1', '#ff8f6b', '#ff6b9d'];
let colorCursor = 0;
function nextColor(): string {
  const c = NEW_BODY_COLORS[colorCursor % NEW_BODY_COLORS.length];
  colorCursor += 1;
  return c;
}

/**
 * Framing radius for the camera. Uses a high percentile of body distances (not
 * the raw maximum) so a single far outlier — Neptune at 30 AU, an ejected body —
 * doesn't shrink the interesting inner system to sub-pixel. Small systems just
 * use their full extent.
 */
function systemRadius(bodies: readonly Body[]): number {
  const dists = bodies.map((b) => b.position.length()).sort((a, b) => a - b);
  if (dists.length === 0) return 1;
  const max = dists[dists.length - 1];
  if (dists.length <= 4) return max > 0 ? max : 1;
  const p = dists[Math.floor(dists.length * 0.72)] * 1.35;
  const r = Math.min(max, Math.max(p, dists[dists.length - 1] * 0.25));
  return r > 0 ? r : 1;
}

/** Construct a reasonable new body: a small companion on a circular orbit
 *  around the most massive body, so "Add body" drops in something that moves. */
function makeDefaultNewBody(sim: Simulation): Body {
  const G = sim.params.G;
  const center = sim.bodies.reduce<Body | null>(
    (best, b) => (!best || b.mass > best.mass ? b : best),
    null,
  );
  if (!center) {
    return createBody({
      name: 'New Body',
      mass: 1,
      radius: 0.2,
      position: new Vector3(2, 0, 0),
      color: nextColor(),
    });
  }
  let maxR = 0;
  for (const b of sim.bodies) maxR = Math.max(maxR, b.position.distanceTo(center.position));
  const d = Math.max(maxR * 1.3, center.radius * 6, 1);
  const speed = Math.sqrt((G * center.mass) / d);
  return createBody({
    name: 'New Body',
    mass: Math.max(center.mass * 1e-4, 1e-6),
    radius: Math.max(center.radius * 0.4, 0.08),
    position: center.position.add(new Vector3(d, 0, 0)),
    velocity: center.velocity.add(new Vector3(0, speed, 0)),
    color: nextColor(),
  });
}

let logCursor = 0;

export interface OrbitLabStore {
  // identity / meta
  presetId: string;
  systemName: string;
  systemDescription: string;
  // physics params (mirrors of sim.params, for the UI)
  integrator: IntegratorName;
  dt: number;
  softening: number;
  collisionsEnabled: boolean;
  G: number;
  // time controls
  playing: boolean;
  stepsPerFrame: number;
  // view
  view: ViewOptions;
  selectedId: string | null;
  // published snapshots
  bodies: Body[];
  metrics: DriftMetrics | null;
  history: HistorySample[];
  selectedReadout: SelectedReadout | null;
  fps: number;
  logs: LogEntry[];

  // wiring
  attachScene: (sm: SceneManager) => void;
  /** Advance one "frame" without a renderer — used if WebGL is unavailable so
   *  telemetry, graphs, and the comparison still work. */
  headlessTick: () => void;

  // actions
  loadPreset: (id: string) => void;
  resetSim: () => void;
  setPlaying: (v: boolean) => void;
  togglePlay: () => void;
  stepOnce: () => void;
  setStepsPerFrame: (n: number) => void;
  setIntegrator: (name: IntegratorName) => void;
  setDt: (v: number) => void;
  setSoftening: (v: number) => void;
  setCollisionsEnabled: (v: boolean) => void;
  setView: (patch: Partial<ViewOptions>) => void;
  selectBody: (id: string | null) => void;
  focusBody: (id: string) => void;
  isFollowing: (id: string) => boolean;
  addBody: () => void;
  deleteBody: (id: string) => void;
  duplicateBody: (id: string) => void;
  updateBody: (id: string, patch: Partial<Body>) => void;
  toggleLock: (id: string) => void;
  toggleTrail: (id: string) => void;
  getBodySnapshot: (id: string) => Body | undefined;
  getComparisonDefinition: () => SystemDefinition;
  exportBodiesCSV: () => void;
  exportMetricsCSV: () => void;
  saveJSON: () => void;
  loadJSONFile: (file: File) => void;
}

export function useOrbitLab(): OrbitLabStore {
  const bootRef = useRef<SystemDefinition | null>(null);
  if (!bootRef.current) bootRef.current = getPreset(DEFAULT_PRESET_ID)!.build();
  const simRef = useRef<Simulation | null>(null);
  if (!simRef.current) simRef.current = new Simulation(bootRef.current);

  const sceneRef = useRef<SceneManager | null>(null);

  const [presetId, setPresetId] = useState(DEFAULT_PRESET_ID);
  const [systemName, setSystemName] = useState(() => simRef.current!.name);
  const [systemDescription, setSystemDescription] = useState(() => simRef.current!.description);
  const [integrator, setIntegratorState] = useState<IntegratorName>(
    () => simRef.current!.params.integrator,
  );
  const [dt, setDtState] = useState(() => simRef.current!.params.dt);
  const [softening, setSofteningState] = useState(() => simRef.current!.params.softening);
  const [collisionsEnabled, setCollisionsState] = useState(
    () => simRef.current!.params.collisionsEnabled,
  );
  const [playing, setPlayingState] = useState(true);
  const [stepsPerFrame, setStepsPerFrameState] = useState(
    () => bootRef.current!.suggestedStepsPerFrame,
  );
  const [view, setViewState] = useState<ViewOptions>(() => ({
    ...DEFAULT_VIEW_OPTIONS,
    distanceScale: bootRef.current!.suggestedDistanceScale,
    radiusScale: bootRef.current!.suggestedRadiusScale,
  }));
  const [bodies, setBodies] = useState<Body[]>(() => simRef.current!.bodies.map(cloneBody));
  const [metrics, setMetrics] = useState<DriftMetrics | null>(null);
  const [history, setHistory] = useState<HistorySample[]>([]);
  const [selectedReadout, setSelectedReadout] = useState<SelectedReadout | null>(null);
  const [fps, setFps] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const G = simRef.current!.params.G;
  const selectedId = view.selectedId;

  // Loop-relevant config the animation callback reads without re-registering.
  const loopRef = useRef({ playing, stepsPerFrame, view });
  useEffect(() => {
    loopRef.current = { playing, stepsPerFrame, view };
  }, [playing, stepsPerFrame, view]);

  const lastPublishRef = useRef(0);
  const bodiesSigRef = useRef('');
  const processedEventsRef = useRef(0);

  const pushLog = useCallback((message: string, kind: LogEntry['kind'], simTime: number | null) => {
    logCursor += 1;
    const entry: LogEntry = { id: logCursor, message, kind, simTime };
    setLogs((prev) => {
      const next = [entry, ...prev];
      return next.length > 60 ? next.slice(0, 60) : next;
    });
  }, []);

  /** Copy live sim state into React (throttled). Detects merges + body changes. */
  const publish = useCallback(() => {
    const sim = simRef.current!;
    setMetrics(sim.getDriftMetrics());
    setHistory(sim.history.slice());
    setFps(sceneRef.current?.getFps() ?? 0);

    const selId = loopRef.current.view.selectedId;
    const sel = selId ? sim.getBody(selId) : undefined;
    setSelectedReadout(
      sel
        ? {
            position: sel.position.clone(),
            velocity: sel.velocity.clone(),
            speed: sel.velocity.length(),
            distanceFromOrigin: sel.position.length(),
          }
        : null,
    );

    // Refresh the editable body list only when the SET of bodies changed
    // (add / delete / merge) — avoids churning inputs every 100 ms.
    const sig = `${sim.bodies.length}:${sim.bodies.map((b) => b.id).join(',')}`;
    if (sig !== bodiesSigRef.current) {
      bodiesSigRef.current = sig;
      setBodies(sim.bodies.map(cloneBody));
    }

    // Emit log lines for any new collision merges.
    if (sim.collisionEvents.length > processedEventsRef.current) {
      for (let i = processedEventsRef.current; i < sim.collisionEvents.length; i++) {
        const ev = sim.collisionEvents[i];
        pushLog(`${ev.survivorName} absorbed ${ev.absorbedName}`, 'event', ev.time);
      }
      processedEventsRef.current = sim.collisionEvents.length;
    }
  }, [pushLog]);

  const forceRefreshBodies = useCallback(() => {
    const sim = simRef.current!;
    bodiesSigRef.current = `${sim.bodies.length}:${sim.bodies.map((b) => b.id).join(',')}`;
    setBodies(sim.bodies.map(cloneBody));
  }, []);

  // --- scene wiring -----------------------------------------------------------

  const attachScene = useCallback(
    (sm: SceneManager) => {
      sceneRef.current = sm;
      sm.setOnSelect((id) => {
        setViewState((v) => ({ ...v, selectedId: id }));
      });
      sm.setFrameCallback(() => {
        const sim = simRef.current!;
        const { playing: run, stepsPerFrame: steps, view: v } = loopRef.current;
        if (run && steps > 0) sim.stepMany(steps);
        sm.syncBodies(sim.bodies, v);
        const now = performance.now();
        if (now - lastPublishRef.current >= PUBLISH_MS) {
          lastPublishRef.current = now;
          publish();
        }
      });
      const sim = simRef.current!;
      sm.frameSystem(systemRadius(sim.bodies), loopRef.current.view.distanceScale);
      publish();
    },
    [publish],
  );

  useEffect(() => {
    return () => sceneRef.current?.dispose();
  }, []);

  const headlessTick = useCallback(() => {
    const sim = simRef.current!;
    const { playing: run, stepsPerFrame: steps } = loopRef.current;
    if (run && steps > 0) sim.stepMany(steps);
    publish();
  }, [publish]);

  // --- preset / lifecycle -----------------------------------------------------

  const applyDefinition = useCallback(
    (def: SystemDefinition, label: string) => {
      const sim = simRef.current!;
      sim.loadSystem(def);
      setSystemName(sim.name);
      setSystemDescription(sim.description);
      setIntegratorState(def.integrator);
      setDtState(def.dt);
      setSofteningState(def.softening);
      setCollisionsState(def.collisionsEnabled);
      setStepsPerFrameState(def.suggestedStepsPerFrame);
      setPlayingState(true);
      const nextView: ViewOptions = {
        ...DEFAULT_VIEW_OPTIONS,
        distanceScale: def.suggestedDistanceScale,
        radiusScale: def.suggestedRadiusScale,
        selectedId: null,
      };
      setViewState(nextView);
      loopRef.current = { playing: true, stepsPerFrame: def.suggestedStepsPerFrame, view: nextView };
      processedEventsRef.current = 0;
      forceRefreshBodies();
      const scene = sceneRef.current;
      if (scene) {
        scene.resetScene();
        scene.frameSystem(systemRadius(sim.bodies), nextView.distanceScale);
      }
      publish();
      pushLog(label, 'info', 0);
    },
    [forceRefreshBodies, publish, pushLog],
  );

  const loadPreset = useCallback(
    (id: string) => {
      const preset = getPreset(id);
      if (!preset) return;
      setPresetId(id);
      applyDefinition(preset.build(), `Loaded preset · ${preset.name}`);
    },
    [applyDefinition],
  );

  const resetSim = useCallback(() => {
    const sim = simRef.current!;
    sim.reset();
    processedEventsRef.current = 0;
    sceneRef.current?.clearTrails();
    forceRefreshBodies();
    publish();
    pushLog('Reset to initial state', 'info', 0);
  }, [forceRefreshBodies, publish, pushLog]);

  // --- time controls ----------------------------------------------------------

  const setPlaying = useCallback((v: boolean) => setPlayingState(v), []);
  const togglePlay = useCallback(() => setPlayingState((p) => !p), []);
  const stepOnce = useCallback(() => {
    const sim = simRef.current!;
    sim.step();
    sceneRef.current?.syncBodies(sim.bodies, loopRef.current.view);
    publish();
  }, [publish]);
  const setStepsPerFrame = useCallback((n: number) => setStepsPerFrameState(n), []);

  // --- physics params ---------------------------------------------------------

  const setIntegrator = useCallback(
    (name: IntegratorName) => {
      simRef.current!.setIntegrator(name);
      setIntegratorState(name);
      pushLog(`Integrator → ${name}`, 'info', simRef.current!.time);
    },
    [pushLog],
  );
  const setDt = useCallback((v: number) => {
    simRef.current!.setParams({ dt: v });
    setDtState(v);
  }, []);
  const setSoftening = useCallback((v: number) => {
    simRef.current!.setParams({ softening: v });
    setSofteningState(v);
  }, []);
  const setCollisionsEnabled = useCallback(
    (v: boolean) => {
      simRef.current!.setParams({ collisionsEnabled: v });
      setCollisionsState(v);
      pushLog(`Collisions ${v ? 'enabled' : 'disabled'}`, 'info', simRef.current!.time);
    },
    [pushLog],
  );

  // --- view -------------------------------------------------------------------

  const setView = useCallback((patch: Partial<ViewOptions>) => {
    setViewState((v) => ({ ...v, ...patch }));
  }, []);
  const selectBody = useCallback((id: string | null) => {
    setViewState((v) => ({ ...v, selectedId: id }));
  }, []);
  const focusBody = useCallback((id: string) => {
    setViewState((v) => ({ ...v, selectedId: id }));
    sceneRef.current?.focusOn(id);
  }, []);
  const isFollowing = useCallback((id: string) => sceneRef.current?.isFollowing(id) ?? false, []);

  // --- body editing -----------------------------------------------------------

  const addBody = useCallback(() => {
    const sim = simRef.current!;
    const body = sim.addBody(makeDefaultNewBody(sim));
    forceRefreshBodies();
    setViewState((v) => ({ ...v, selectedId: body.id }));
    publish();
    pushLog(`Added ${body.name}`, 'info', sim.time);
  }, [forceRefreshBodies, publish, pushLog]);

  const deleteBody = useCallback(
    (id: string) => {
      const sim = simRef.current!;
      const b = sim.getBody(id);
      sim.removeBody(id);
      forceRefreshBodies();
      setViewState((v) => (v.selectedId === id ? { ...v, selectedId: null } : v));
      publish();
      if (b) pushLog(`Deleted ${b.name}`, 'warn', sim.time);
    },
    [forceRefreshBodies, publish, pushLog],
  );

  const duplicateBody = useCallback(
    (id: string) => {
      const sim = simRef.current!;
      const copy = sim.duplicateBody(id);
      forceRefreshBodies();
      if (copy) {
        setViewState((v) => ({ ...v, selectedId: copy.id }));
        pushLog(`Duplicated → ${copy.name}`, 'info', sim.time);
      }
      publish();
    },
    [forceRefreshBodies, publish, pushLog],
  );

  const updateBody = useCallback(
    (id: string, patch: Partial<Body>) => {
      simRef.current!.updateBody(id, patch);
      // Structural fields shown in the list need an immediate refresh; positions
      // ride along on the next publish.
      if (
        patch.name !== undefined ||
        patch.color !== undefined ||
        patch.mass !== undefined ||
        patch.radius !== undefined ||
        patch.locked !== undefined ||
        patch.showTrail !== undefined
      ) {
        forceRefreshBodies();
      }
    },
    [forceRefreshBodies],
  );

  const toggleLock = useCallback(
    (id: string) => {
      const b = simRef.current!.getBody(id);
      if (b) updateBody(id, { locked: !b.locked });
    },
    [updateBody],
  );
  const toggleTrail = useCallback(
    (id: string) => {
      const b = simRef.current!.getBody(id);
      if (b) updateBody(id, { showTrail: !b.showTrail });
    },
    [updateBody],
  );
  const getBodySnapshot = useCallback((id: string) => {
    const b = simRef.current!.getBody(id);
    return b ? cloneBody(b) : undefined;
  }, []);

  /** A SystemDefinition for the Numerical Accuracy comparison: pristine preset
   *  initial conditions when a registry preset is loaded, else the current
   *  (custom/loaded) state as initial conditions. */
  const getComparisonDefinition = useCallback((): SystemDefinition => {
    const preset = getPreset(presetId);
    if (preset) return preset.build();
    const sim = simRef.current!;
    return {
      name: sim.name,
      description: sim.description,
      bodies: sim.bodies.map(cloneBody),
      G: sim.params.G,
      softening: sim.params.softening,
      dt: sim.params.dt,
      integrator: sim.params.integrator,
      collisionsEnabled: false,
      suggestedDistanceScale: 1,
      suggestedRadiusScale: 1,
      suggestedStepsPerFrame: 4,
    };
  }, [presetId]);

  // --- import / export --------------------------------------------------------

  const exportBodiesCSV = useCallback(() => {
    downloadText('orbitlab-bodies.csv', simRef.current!.toBodiesCSV(), 'text/csv');
    pushLog('Exported body states (CSV)', 'info', simRef.current!.time);
  }, [pushLog]);
  const exportMetricsCSV = useCallback(() => {
    downloadText('orbitlab-metrics.csv', simRef.current!.toMetricsCSV(), 'text/csv');
    pushLog('Exported metrics history (CSV)', 'info', simRef.current!.time);
  }, [pushLog]);
  const saveJSON = useCallback(() => {
    downloadText('orbitlab-system.json', simRef.current!.toJSONString(), 'application/json');
    pushLog('Saved system (JSON)', 'info', simRef.current!.time);
  }, [pushLog]);
  const loadJSONFile = useCallback(
    async (file: File) => {
      try {
        const text = await readFileAsText(file);
        const data = JSON.parse(text);
        const sim = simRef.current!;
        sim.loadSerialized(data);
        setPresetId('custom');
        setSystemName(sim.name);
        setSystemDescription(sim.description);
        setIntegratorState(sim.params.integrator);
        setDtState(sim.params.dt);
        setSofteningState(sim.params.softening);
        setCollisionsState(sim.params.collisionsEnabled);
        const nextView: ViewOptions = { ...DEFAULT_VIEW_OPTIONS, selectedId: null };
        setViewState(nextView);
        loopRef.current = { ...loopRef.current, view: nextView };
        processedEventsRef.current = 0;
        forceRefreshBodies();
        sceneRef.current?.resetScene();
        sceneRef.current?.frameSystem(systemRadius(sim.bodies), nextView.distanceScale);
        publish();
        pushLog(`Loaded system · ${sim.name}`, 'info', 0);
      } catch (err) {
        pushLog(`Load failed: ${(err as Error).message}`, 'warn', null);
      }
    },
    [forceRefreshBodies, publish, pushLog],
  );

  return {
    presetId,
    systemName,
    systemDescription,
    integrator,
    dt,
    softening,
    collisionsEnabled,
    G,
    playing,
    stepsPerFrame,
    view,
    selectedId,
    bodies,
    metrics,
    history,
    selectedReadout,
    fps,
    logs,
    attachScene,
    headlessTick,
    loadPreset,
    resetSim,
    setPlaying,
    togglePlay,
    stepOnce,
    setStepsPerFrame,
    setIntegrator,
    setDt,
    setSoftening,
    setCollisionsEnabled,
    setView,
    selectBody,
    focusBody,
    isFollowing,
    addBody,
    deleteBody,
    duplicateBody,
    updateBody,
    toggleLock,
    toggleTrail,
    getBodySnapshot,
    getComparisonDefinition,
    exportBodiesCSV,
    exportMetricsCSV,
    saveJSON,
    loadJSONFile,
  };
}

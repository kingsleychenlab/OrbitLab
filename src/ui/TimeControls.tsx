import type { OrbitLabStore } from '../state/useOrbitLab';
import { LIMITS } from '../physics';
import { Slider, LogSlider } from './controls';
import { fmtSci } from './format';

/** Transport (play / step / reset) plus the speed and timestep sliders. */
export function TimeControls({ store }: { store: OrbitLabStore }) {
  return (
    <>
      <div className="transport">
        <button
          className={`btn transport__play ${store.playing ? '' : 'btn--primary'}`}
          onClick={store.togglePlay}
        >
          {store.playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button
          className="btn"
          onClick={store.stepOnce}
          disabled={store.playing}
          title="Advance exactly one timestep (while paused)"
        >
          ⏭ Step
        </button>
        <button className="btn" onClick={store.resetSim} title="Reset to initial conditions">
          ↺ Reset
        </button>
      </div>

      <Slider
        label="Speed"
        value={store.stepsPerFrame}
        min={LIMITS.STEPS_PER_FRAME_MIN}
        max={LIMITS.STEPS_PER_FRAME_MAX}
        step={1}
        display={`${store.stepsPerFrame} steps/frame`}
        onChange={store.setStepsPerFrame}
      />

      <LogSlider
        label="Timestep Δt"
        value={store.dt}
        min={LIMITS.DT_MIN}
        max={LIMITS.DT_MAX}
        display={fmtSci(store.dt)}
        onChange={store.setDt}
      />
    </>
  );
}

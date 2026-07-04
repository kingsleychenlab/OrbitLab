/**
 * Public surface of the framework-agnostic physics engine.
 *
 * Nothing in `src/physics` imports React or Three.js — this barrel is the single
 * import point for the renderer, the UI, and the tests.
 */
export { Vector3 } from './Vector3';
export {
  createBody,
  cloneBody,
  bodyToJSON,
  bodyFromJSON,
  nextBodyId,
  type Body,
  type BodyJSON,
} from './Body';
export * from './constants';
export { computeAccelerations, accelerationsFromState, pairwiseForce } from './gravity';
export {
  euler,
  semiImplicitEuler,
  leapfrog,
  rk4,
  getIntegrator,
  INTEGRATORS,
  INTEGRATOR_LIST,
  type IntegratorFn,
  type IntegratorName,
  type IntegratorInfo,
} from './integrators';
export {
  resolveCollisions,
  mergeBodies,
  type CollisionEvent,
  type CollisionOptions,
} from './collisions';
export {
  kineticEnergy,
  potentialEnergy,
  totalEnergy,
  linearMomentum,
  angularMomentum,
  centerOfMass,
  centerOfMassVelocity,
  totalMass,
  computeMetrics,
  relativeDrift,
  vectorDrift,
  type Metrics,
} from './metrics';
export {
  Simulation,
  type SystemDefinition,
  type SimulationParams,
  type HistorySample,
  type DriftMetrics,
  type SerializedSystem,
} from './simulation';

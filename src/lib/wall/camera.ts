// Pure camera-motion math for the wall. Each function returns the delta to
// feed panzoom's moveBy(); the page applies it. No panzoom/DOM coupling here.

export interface Vec {
  x: number;
  y: number;
}
export interface Move {
  dx: number;
  dy: number;
}

/** Was a pointer interaction a tap (vs a pan)? */
export function isTap(
  e: { clientX: number; clientY: number },
  downX: number,
  downY: number,
  threshold = 8,
) {
  return Math.hypot(e.clientX - downX, e.clientY - downY) < threshold;
}

// --- Ambient "gallery tour" -------------------------------------------------
// A slow Lissajous path sized to the whole field. The irrational frequency
// ratio means the curve never exactly repeats and is dense in the bounding
// box, so the camera roams edges, corners and center evenly — no center bias.

/** How far toward the rim the tour roams, as a fraction of the field extent. */
export const TOUR_COVER = 0.75;
/** Base traversal speed (rad/ms). Higher = the camera moves around faster. */
export const TOUR_SPEED = 0.00009;

/** Target world-center the camera should be over at the given phase (ms). */
export function tourTarget(
  phase: number,
  extentX: number,
  extentY: number,
  cover = TOUR_COVER,
): Vec {
  return {
    x: extentX * cover * Math.sin(phase * TOUR_SPEED),
    y: extentY * cover * Math.sin(phase * TOUR_SPEED * Math.SQRT2), // √2 ratio -> non-repeating
  };
}

/** Ease the camera toward the tour target; also gives a smooth rejoin after a drag. */
export function tourStep(transform: Vec, target: Vec, dt: number): Move {
  const k = Math.min(1, 0.0018 * dt);
  return { dx: (target.x - transform.x) * k, dy: (target.y - transform.y) * k };
}

/**
 * One step easing the camera back toward center (used while searching, so
 * matches that re-flow to the middle come into view). Null once centered.
 */
export function centerStep(transform: Vec, dt: number): Move | null {
  if (Math.abs(transform.x) <= 0.5 && Math.abs(transform.y) <= 0.5) return null;
  const k = Math.min(1, 0.012 * dt);
  return { dx: -transform.x * k, dy: -transform.y * k };
}

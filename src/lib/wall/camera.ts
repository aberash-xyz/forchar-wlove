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
export function isTap(e: { clientX: number; clientY: number }, downX: number, downY: number, threshold = 8) {
	return Math.hypot(e.clientX - downX, e.clientY - downY) < threshold;
}

/**
 * One ambient-drift step: a gently curving wander, softly bounded to the
 * populated field. Returns the move plus the advanced angle.
 */
export function driftStep(
	angle: number,
	dt: number,
	transform: Vec,
	extentX: number,
	extentY: number,
	speed = 0.026 // px/ms ~ 26px/s
): Move & { angle: number } {
	const next = angle + 0.00016 * dt;
	let dx = Math.cos(next) * speed * dt;
	let dy = Math.sin(next) * speed * dt;
	const lx = extentX * 0.7;
	const ly = extentY * 0.7;
	if (Math.abs(transform.x) > lx) dx -= Math.sign(transform.x) * (Math.abs(transform.x) - lx) * 0.02;
	if (Math.abs(transform.y) > ly) dy -= Math.sign(transform.y) * (Math.abs(transform.y) - ly) * 0.02;
	return { dx, dy, angle: next };
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

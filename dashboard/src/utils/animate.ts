export function pulse(time: number, speed: number = 2, min: number = 0.4, max: number = 1.0): number {
  const t = (Math.sin(time * speed) + 1) / 2;
  return min + t * (max - min);
}

export function bob(time: number, speed: number = 3, amplitude: number = 0.05): number {
  return Math.sin(time * speed) * amplitude;
}

export function breathe(time: number, speed: number = 1.5, amplitude: number = 0.02): number {
  return Math.sin(time * speed) * amplitude;
}

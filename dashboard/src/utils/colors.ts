// Office materials
export const FLOOR_COLOR = 0x1a1a2e;
export const FLOOR_GRID_COLOR = 0x252545;
export const WALL_COLOR = 0x16213e;
export const DESK_COLOR = 0x2d2d44;
export const DESK_TOP_COLOR = 0x3d3d5c;
export const MONITOR_FRAME_COLOR = 0x1a1a2e;
export const CHAIR_COLOR = 0x2a2a3e;

// Ambient
export const AMBIENT_LIGHT = 0x404060;
export const DIRECTIONAL_LIGHT = 0xc8d0ff;
export const ACCENT_LIGHT = 0x6366f1;

// Agent avatar base colors (hue-shifted per agent)
export const AVATAR_PALETTE = [
  0x6366f1, // indigo
  0x8b5cf6, // violet
  0x06b6d4, // cyan
  0x14b8a6, // teal
  0xf59e0b, // amber
  0xec4899, // pink
  0x10b981, // emerald
  0xf97316, // orange
];

export function getAvatarColor(index: number): number {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}

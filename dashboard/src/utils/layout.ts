export interface GridPosition {
  x: number;
  z: number;
  row: number;
  col: number;
}

const DESK_SPACING_X = 4;
const DESK_SPACING_Z = 5;
const COLS = 4;

export function computeDeskPositions(count: number): GridPosition[] {
  const positions: GridPosition[] = [];
  const cols = Math.min(count, COLS);
  const offsetX = ((cols - 1) * DESK_SPACING_X) / 2;
  const rows = Math.ceil(count / COLS);
  const offsetZ = ((rows - 1) * DESK_SPACING_Z) / 2;

  for (let i = 0; i < count; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    positions.push({
      x: col * DESK_SPACING_X - offsetX,
      z: row * DESK_SPACING_Z - offsetZ,
      row,
      col,
    });
  }
  return positions;
}

export function getOfficeFloorSize(agentCount: number): { width: number; depth: number } {
  const cols = Math.min(agentCount, COLS);
  const rows = Math.ceil(agentCount / COLS) || 1;
  return {
    width: Math.max(cols * DESK_SPACING_X + 6, 16),
    depth: Math.max(rows * DESK_SPACING_Z + 6, 16),
  };
}

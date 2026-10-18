// Padlock drawn on a character grid. '#' cells become live 0/1 digits.
// The shackle's last rows tuck behind the body while locked.

export const SHACKLE = [
  '       ########       ',
  '     ############     ',
  '    ####      ####    ',
  '   ####        ####   ',
  '   ####        ####   ',
  '   ####        ####   ',
  '   ####        ####   ',
  '   ####        ####   ',
  '   ####        ####   ',
];

export const BODY = [
  '######################',
  '######################',
  '######################',
  '#########    #########',
  '########      ########',
  '#########    #########',
  '##########  ##########',
  '##########  ##########',
  '##########  ##########',
  '######################',
  '######################',
];

export const COLS = 22;
/** Shackle rows hidden behind the body when locked. */
export const TUCK = 2;
/** How many rows the shackle rises when it opens. */
export const LIFT = 4;
/** Keyhole centre in body-grid coordinates. */
export const KEYHOLE = { col: 10.5, row: 4.6 };

export interface Cell {
  col: number;
  row: number;
  /** Reveal threshold 0..1 for the materialise phase. */
  reveal: number;
  /** Resting brightness, gives the grid texture. */
  base: number;
  bit: string;
}

export function cellsOf(rows: string[]): Cell[] {
  const cells: Cell[] = [];
  rows.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] !== '#') continue;
      cells.push({
        col,
        row,
        reveal: Math.random() * 0.85,
        base: 0.62 + Math.random() * 0.38,
        bit: Math.random() < 0.5 ? '0' : '1',
      });
    }
  });
  return cells;
}

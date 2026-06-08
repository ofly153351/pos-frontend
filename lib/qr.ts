/**
 * Minimal QR Code SVG generator — Version 1 (21×21) with EC Level L.
 * Supports up to 17 bytes in byte mode. Returns "" if input is too long.
 * No external libraries required.
 */

// ── GF(256) tables ────────────────────────────────────────────────────────────
const GF_EXP = new Array<number>(512);
const GF_LOG = new Array<number>(256);
(function () {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x > 255) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  GF_LOG[0] = 0;
})();

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

function rsEncode(data: number[], ecCount: number): number[] {
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const f = [1, GF_EXP[i]];
    const r = new Array<number>(gen.length + f.length - 1).fill(0);
    for (let a = 0; a < gen.length; a++)
      for (let b = 0; b < f.length; b++)
        r[a + b] ^= gfMul(gen[a], f[b]);
    gen = r;
  }
  const msg = [...data, ...new Array<number>(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    if (msg[i] === 0) continue;
    for (let j = 1; j < gen.length; j++) msg[i + j] ^= gfMul(gen[j], msg[i]);
  }
  return msg.slice(data.length);
}

// ── Format info for EC Level L, masks 0–7 ─────────────────────────────────────
// These are the FINAL 15-bit sequences (BCH-encoded AND already XOR-masked with
// 0x5412 per ISO/IEC 18004 Table C.1) — placed directly, no further XOR.
const FORMAT_STR = [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976];

// Format info module positions (position 1 — 15 bits, MSB first)
const FMT_POS1: [number, number][] = [
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
  [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
];

const SIZE = 21;
const DATA_BYTES = 19;
const EC_BYTES = 7;

type Matrix = number[][]; // 0 | 1, or -1 for unset

function makeMatrix(): Matrix {
  return Array.from({ length: SIZE }, () => new Array<number>(SIZE).fill(-1));
}

function placeFinderPattern(mat: Matrix, row: number, col: number) {
  const pat = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 7; c++)
      mat[row + r][col + c] = pat[r][c];
  // Separator row/col
  for (let i = -1; i <= 7; i++) {
    const r1 = row + i, c1 = col - 1, c2 = col + 7;
    if (r1 >= 0 && r1 < SIZE) {
      if (c1 >= 0)          mat[r1][c1] = 0;
      if (c2 < SIZE)        mat[r1][c2] = 0;
    }
    const r2 = row - 1, r3 = row + 7, cc = col + i;
    if (cc >= 0 && cc < SIZE) {
      if (r2 >= 0)          mat[r2][cc] = 0;
      if (r3 < SIZE)        mat[r3][cc] = 0;
    }
  }
}

function isFunctionModule(r: number, c: number): boolean {
  if (r <= 8 && c <= 8) return true;            // top-left finder + sep
  if (r <= 8 && c >= SIZE - 8) return true;     // top-right finder + sep
  if (r >= SIZE - 8 && c <= 8) return true;     // bottom-left finder + sep
  if (r === 6 || c === 6) return true;           // timing
  if (r === SIZE - 8 && c === 8) return true;   // dark module
  return false;
}

function evalPenalty(mat: Matrix): number {
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    let run = 1;
    for (let c = 1; c < SIZE; c++) {
      if (mat[r][c] === mat[r][c - 1]) {
        run++;
        if (run === 5) score += 3; else if (run > 5) score++;
      } else run = 1;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let run = 1;
    for (let r = 1; r < SIZE; r++) {
      if (mat[r][c] === mat[r - 1][c]) {
        run++;
        if (run === 5) score += 3; else if (run > 5) score++;
      } else run = 1;
    }
  }
  return score;
}

function applyMask(mat: Matrix, mask: number): Matrix {
  const m = mat.map(row => [...row]);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isFunctionModule(r, c) || m[r][c] === -1) continue;
      let invert = false;
      switch (mask) {
        case 0: invert = (r + c) % 2 === 0; break;
        case 1: invert = r % 2 === 0; break;
        case 2: invert = c % 3 === 0; break;
        case 3: invert = (r + c) % 3 === 0; break;
        case 4: invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
        case 5: invert = (r * c) % 2 + (r * c) % 3 === 0; break;
        case 6: invert = ((r * c) % 2 + (r * c) % 3) % 2 === 0; break;
        case 7: invert = ((r + c) % 2 + (r * c) % 3) % 2 === 0; break;
      }
      if (invert) m[r][c] ^= 1;
    }
  }
  return m;
}

function placeFormatInfo(mat: Matrix, mask: number) {
  const fmt = FORMAT_STR[mask];
  for (let i = 0; i < 15; i++) {
    const bit = (fmt >> (14 - i)) & 1;
    const [r1, c1] = FMT_POS1[i];
    mat[r1][c1] = bit;
    const [r2, c2] = i < 7
      ? [SIZE - 1 - i, 8]
      : [8, SIZE - 15 + i];
    mat[r2][c2] = bit;
  }
  mat[SIZE - 8][8] = 1; // dark module
}

export function generateQrSvg(text: string): string {
  // Encode bytes
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c > 255) return ""; // non-latin1 not supported
    bytes.push(c);
  }
  if (bytes.length > 17) return ""; // exceeds V1 EC-L capacity

  // Build bit stream (byte mode)
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4);          // mode: byte
  pushBits(bytes.length, 8);    // char count
  for (const b of bytes) pushBits(b, 8);
  // terminator + byte pad
  for (let i = 0; i < 4 && bits.length < DATA_BYTES * 8; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  // pad codewords
  let pi = 0;
  while (bits.length < DATA_BYTES * 8) {
    pushBits(pi % 2 === 0 ? 0xec : 0x11, 8);
    pi++;
  }

  // Convert to codewords
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data.push(b);
  }

  // Reed-Solomon error correction
  const ec = rsEncode(data, EC_BYTES);
  const allCW = [...data, ...ec];

  // Build codeword bit stream
  const cwBits: number[] = [];
  for (const cw of allCW) for (let i = 7; i >= 0; i--) cwBits.push((cw >> i) & 1);

  // Build function-module matrix
  const mat = makeMatrix();
  placeFinderPattern(mat, 0, 0);
  placeFinderPattern(mat, 0, SIZE - 7);
  placeFinderPattern(mat, SIZE - 7, 0);

  // Timing patterns
  for (let i = 8; i < SIZE - 8; i++) {
    mat[6][i] = i % 2 === 0 ? 1 : 0;
    mat[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Reserve format info positions
  for (const [r, c] of FMT_POS1) if (mat[r][c] === -1) mat[r][c] = 0;
  for (let i = 0; i < 7; i++) {
    if (mat[SIZE - 1 - i][8] === -1) mat[SIZE - 1 - i][8] = 0;
    if (mat[8][SIZE - 1 - i] === -1) mat[8][SIZE - 1 - i] = 0;
  }
  mat[SIZE - 8][8] = 1;

  // Place data codewords
  let bi = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let count = 0; count < SIZE; count++) {
      const r = upward ? SIZE - 1 - count : count;
      for (let d = 0; d < 2; d++) {
        const c = right - d;
        // Guard against function modules that may still be unset (e.g. the
        // top-right format cell (8, SIZE-8)); placeFormatInfo() fills them later.
        if (mat[r][c] === -1 && !isFunctionModule(r, c)) {
          mat[r][c] = bi < cwBits.length ? cwBits[bi++] : 0;
        }
      }
    }
    upward = !upward;
  }

  // Choose best mask
  let bestMask = 0, bestScore = Infinity;
  const masked: Matrix[] = [];
  for (let m = 0; m < 8; m++) {
    const candidate = applyMask(mat, m);
    placeFormatInfo(candidate, m);
    const s = evalPenalty(candidate);
    masked.push(candidate);
    if (s < bestScore) { bestScore = s; bestMask = m; }
  }

  const final = masked[bestMask];

  // Render SVG
  const cell = 6, quiet = 4;
  const dim = (SIZE + quiet * 2) * cell;
  let rects = "";
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (final[r][c] === 1) {
        rects += `<rect x="${(c + quiet) * cell}" y="${(r + quiet) * cell}" width="${cell}" height="${cell}" fill="#0f172a"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}"><rect width="${dim}" height="${dim}" fill="white"/>${rects}</svg>`;
}

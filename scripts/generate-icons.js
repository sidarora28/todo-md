/**
 * Generate a placeholder 1024x1024 PNG icon for electron-builder.
 * Uses only Node.js built-ins (no extra dependencies).
 *
 * Run:  node scripts/generate-icons.js
 *
 * Replace electron/icons/icon.png with your real icon when ready —
 * electron-builder auto-converts PNG to .icns (macOS) and .ico (Windows).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const WIDTH = 1024;
const HEIGHT = 1024;
const OUT_DIR = path.join(__dirname, '..', 'electron', 'icons');

// Brand color — teal #2DA562
const R = 0x2D, G = 0xA5, B = 0x62;

// ── CRC-32 (used by PNG chunks) ──────────────────────────────────

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG helpers ──────────────────────────────────────────────────

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPNG(w, h) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Pixel data — solid color, one filter byte (0) per row
  const row = Buffer.alloc(1 + w * 3);
  row[0] = 0; // filter: none
  for (let x = 0; x < w; x++) {
    row[1 + x * 3]     = R;
    row[1 + x * 3 + 1] = G;
    row[1 + x * 3 + 2] = B;
  }
  const raw = Buffer.concat(Array(h).fill(row));
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const outPath = path.join(OUT_DIR, 'icon.png');
fs.writeFileSync(outPath, createPNG(WIDTH, HEIGHT));
console.log(`✔ Placeholder icon generated: ${outPath} (${WIDTH}×${HEIGHT})`);

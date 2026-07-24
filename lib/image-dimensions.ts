// Minimal, dependency-free PNG/JPEG pixel-dimension readers — used to size
// an uploaded letterhead image proportionally in the injected Word header
// (see lib/docx-letterhead.ts) without pulling in a new image library for
// one small need, matching this codebase's established convention of
// hand-rolling small format-parsing needs (see lib/date-format.ts).

function readPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  // PNG signature (8 bytes) + IHDR chunk length (4) + "IHDR" (4) = offset 16
  // for width (4 bytes, big-endian), 20 for height.
  if (buffer.length < 24) return null;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    // SOF0-SOF15 (frame markers) carry the dimensions, excluding the
    // DHT/JPG/DAC markers (C4, C8, CC) that share the 0xC0-0xCF range.
    const isSofMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSofMarker) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    offset += 2 + segmentLength;
  }
  return null;
}

/** Returns null (never throws) when the buffer isn't a recognized PNG/JPEG, or is truncated/corrupt. */
export function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    return readPngDimensions(buffer) ?? readJpegDimensions(buffer);
  } catch {
    return null;
  }
}

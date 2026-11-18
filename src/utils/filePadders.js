/**
 * Utilities for increasing image file size without altering visible pixel data.
 * Injects valid format-compliant metadata/padding segments and verifies decoder compatibility.
 */

// CRC32 table for PNG chunk generation
let crcTable = null;
function makeCrcTable() {
  const cTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    cTable[n] = c;
  }
  return cTable;
}

function crc32(buf, offset, length) {
  if (!crcTable) crcTable = makeCrcTable();
  let c = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Finds the index of the SOS (0xFF 0xDA) marker in a JPEG byte array.
 * Markers before SOS are safe for inserting metadata (COM/APPn segments).
 */
function findJpegSos(u8) {
  if (u8.length < 4 || u8[0] !== 0xff || u8[1] !== 0xd8) return -1;
  let pos = 2;
  while (pos < u8.length - 1) {
    if (u8[pos] !== 0xff) {
      pos++;
      continue;
    }
    while (pos < u8.length && u8[pos] === 0xff) {
      pos++;
    }
    if (pos >= u8.length) break;
    const marker = u8[pos];
    pos++;
    if (marker === 0xda) {
      // Found SOS marker (0xFF 0xDA)
      return pos - 2;
    }
    // Standalone markers without length: RST0..RST7, SOI, EOI, TEM
    if (
      (marker >= 0xd0 && marker <= 0xd7) ||
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01
    ) {
      continue;
    }
    // Variable-length marker segment has 2-byte big-endian length
    if (pos + 1 >= u8.length) break;
    const len = (u8[pos] << 8) | u8[pos + 1];
    if (len < 2) break;
    pos += len;
  }
  return -1;
}

/**
 * Finds the index of the EOI (0xFF 0xD9) marker in a JPEG byte array.
 */
function findJpegEoi(u8) {
  for (let i = u8.length - 2; i >= 0; i--) {
    if (u8[i] === 0xff && u8[i + 1] === 0xd9) {
      return i;
    }
  }
  return -1;
}

/**
 * Pads a JPEG buffer by inserting valid COM (0xFF 0xFE) comment marker segments
 * immediately before SOS (0xFF 0xDA), or appending trailing null bytes after EOI (0xFF 0xD9).
 */
function padJpeg(buffer, targetAdditionalBytes) {
  if (targetAdditionalBytes <= 0) return new Uint8Array(buffer);
  const u8 = new Uint8Array(buffer);

  const sosIndex = findJpegSos(u8);
  const eoiIndex = findJpegEoi(u8);

  // If SOS not found or additional bytes < 4, append trailing null bytes after EOI
  if (sosIndex === -1 || targetAdditionalBytes < 4) {
    const insertPoint = eoiIndex !== -1 ? eoiIndex + 2 : u8.length;
    const out = new Uint8Array(u8.length + targetAdditionalBytes);
    out.set(u8.subarray(0, insertPoint), 0);
    // Null bytes (0x00) are automatically set by Uint8Array initialization
    if (insertPoint < u8.length) {
      out.set(u8.subarray(insertPoint), insertPoint + targetAdditionalBytes);
    }
    return out;
  }

  // Build COM segments chunked in <= 65,533 byte payloads (total segment length <= 65,535 bytes)
  let remaining = targetAdditionalBytes;
  const segments = [];

  while (remaining >= 4) {
    let segTotal = Math.min(remaining, 65535);
    // Ensure we don't leave 1, 2, or 3 leftover bytes that cannot form a valid COM segment
    if (remaining - segTotal > 0 && remaining - segTotal < 4) {
      segTotal -= 4 - (remaining - segTotal);
    }
    const seg = new Uint8Array(segTotal);
    seg[0] = 0xff;
    seg[1] = 0xfe;
    const lenField = segTotal - 2;
    seg[2] = (lenField >> 8) & 0xff;
    seg[3] = lenField & 0xff;
    // Fill payload with benign space characters
    for (let j = 4; j < segTotal; j++) {
      seg[j] = 0x20;
    }
    segments.push(seg);
    remaining -= segTotal;
  }

  const totalSegmentBytes = segments.reduce((sum, s) => sum + s.length, 0);
  const trailingBytes = remaining; // Leftover if any
  const out = new Uint8Array(u8.length + totalSegmentBytes + trailingBytes);

  // Copy header up to SOS
  out.set(u8.subarray(0, sosIndex), 0);
  let cur = sosIndex;
  // Insert COM segments
  for (const seg of segments) {
    out.set(seg, cur);
    cur += seg.length;
  }
  // Copy SOS and remaining scan data
  out.set(u8.subarray(sosIndex), cur);
  // Trailing bytes (if any) are already zeroed at the end of the array

  return out;
}

/**
 * Pads a PNG buffer by inserting an ancillary 'tEXt' chunk with a valid CRC-32 checksum
 * immediately before the IEND chunk.
 */
function padPng(buffer, targetAdditionalBytes) {
  if (targetAdditionalBytes <= 0) return new Uint8Array(buffer);
  const u8 = new Uint8Array(buffer);

  // Find IEND chunk (12 bytes: length 0x00 0x00 0x00 0x00, 'IEND', 4 bytes CRC)
  let iendIndex = -1;
  for (let i = u8.length - 8; i >= 8; i--) {
    if (
      u8[i] === 0x49 &&
      u8[i + 1] === 0x45 &&
      u8[i + 2] === 0x4e &&
      u8[i + 3] === 0x44
    ) {
      iendIndex = i - 4; // Start of IEND length
      break;
    }
  }

  if (iendIndex === -1) {
    const out = new Uint8Array(u8.length + targetAdditionalBytes);
    out.set(u8, 0);
    return out;
  }

  // Construct ancillary tEXt chunk
  let chunk;
  if (targetAdditionalBytes >= 20) {
    const payloadDataLen = targetAdditionalBytes - 12;
    chunk = new Uint8Array(12 + payloadDataLen);
    // Length
    chunk[0] = (payloadDataLen >>> 24) & 0xff;
    chunk[1] = (payloadDataLen >>> 16) & 0xff;
    chunk[2] = (payloadDataLen >>> 8) & 0xff;
    chunk[3] = payloadDataLen & 0xff;
    // Chunk type: 'tEXt'
    chunk[4] = 0x74;
    chunk[5] = 0x45;
    chunk[6] = 0x58;
    chunk[7] = 0x74;
    // Keyword "Padding\0"
    const keyword = [0x50, 0x61, 0x64, 0x64, 0x69, 0x6e, 0x67, 0x00];
    chunk.set(keyword, 8);
    // Text payload
    for (let i = 16; i < 8 + payloadDataLen; i++) {
      chunk[i] = 0x20;
    }
    // CRC-32 over type + data
    const crcVal = crc32(chunk, 4, 4 + payloadDataLen);
    const crcOffset = 8 + payloadDataLen;
    chunk[crcOffset] = (crcVal >>> 24) & 0xff;
    chunk[crcOffset + 1] = (crcVal >>> 16) & 0xff;
    chunk[crcOffset + 2] = (crcVal >>> 8) & 0xff;
    chunk[crcOffset + 3] = crcVal & 0xff;
  } else if (targetAdditionalBytes >= 14) {
    const payloadDataLen = targetAdditionalBytes - 12;
    chunk = new Uint8Array(12 + payloadDataLen);
    chunk[0] = (payloadDataLen >>> 24) & 0xff;
    chunk[1] = (payloadDataLen >>> 16) & 0xff;
    chunk[2] = (payloadDataLen >>> 8) & 0xff;
    chunk[3] = payloadDataLen & 0xff;
    chunk[4] = 0x74;
    chunk[5] = 0x45;
    chunk[6] = 0x58;
    chunk[7] = 0x74;
    // Minimal keyword "P\0"
    chunk[8] = 0x50;
    chunk[9] = 0x00;
    for (let i = 10; i < 8 + payloadDataLen; i++) {
      chunk[i] = 0x20;
    }
    const crcVal = crc32(chunk, 4, 4 + payloadDataLen);
    const crcOffset = 8 + payloadDataLen;
    chunk[crcOffset] = (crcVal >>> 24) & 0xff;
    chunk[crcOffset + 1] = (crcVal >>> 16) & 0xff;
    chunk[crcOffset + 2] = (crcVal >>> 8) & 0xff;
    chunk[crcOffset + 3] = crcVal & 0xff;
  } else {
    // Minimum valid tEXt chunk is 14 bytes (empty text with "P\0" keyword)
    chunk = new Uint8Array(14);
    chunk[3] = 0x02; // length = 2
    chunk[4] = 0x74;
    chunk[5] = 0x45;
    chunk[6] = 0x58;
    chunk[7] = 0x74;
    chunk[8] = 0x50;
    chunk[9] = 0x00;
    const crcVal = crc32(chunk, 4, 6);
    chunk[10] = (crcVal >>> 24) & 0xff;
    chunk[11] = (crcVal >>> 16) & 0xff;
    chunk[12] = (crcVal >>> 8) & 0xff;
    chunk[13] = crcVal & 0xff;
  }

  const out = new Uint8Array(u8.length + chunk.length);
  out.set(u8.subarray(0, iendIndex), 0);
  out.set(chunk, iendIndex);
  out.set(u8.subarray(iendIndex), iendIndex + chunk.length);

  return out;
}

/**
 * Pads a WebP (RIFF) buffer by appending a RIFF JUNK chunk (even-byte aligned)
 * and updating the 4-byte little-endian file size field at bytes 4..7 of the RIFF header.
 */
function padWebP(buffer, targetAdditionalBytes) {
  if (targetAdditionalBytes <= 0) return new Uint8Array(buffer);
  const u8 = new Uint8Array(buffer);
  if (u8.length < 12) return u8;

  // RIFF container: [0..3: RIFF], [4..7: FileSize - 8 (LE)], [8..11: WEBP]
  // Append RIFF 'JUNK' chunk (FourCC: 'JUNK' -> 0x4A 0x55 0x4E 0x4B)
  const chunkHeaderSize = 8;
  const rawPayload = Math.max(0, targetAdditionalBytes - chunkHeaderSize);
  const payloadSize = rawPayload;
  const isOdd = payloadSize % 2 !== 0;
  const totalChunkSize = chunkHeaderSize + payloadSize + (isOdd ? 1 : 0);

  const out = new Uint8Array(u8.length + totalChunkSize);
  out.set(u8, 0);

  const chunkOffset = u8.length;
  // FourCC: 'JUNK'
  out[chunkOffset] = 0x4a;     // 'J'
  out[chunkOffset + 1] = 0x55; // 'U'
  out[chunkOffset + 2] = 0x4e; // 'N'
  out[chunkOffset + 3] = 0x4b; // 'K'

  // Chunk payload size in little-endian (excluding padding byte)
  out[chunkOffset + 4] = payloadSize & 0xff;
  out[chunkOffset + 5] = (payloadSize >> 8) & 0xff;
  out[chunkOffset + 6] = (payloadSize >> 16) & 0xff;
  out[chunkOffset + 7] = (payloadSize >> 24) & 0xff;

  // Payload content
  for (let i = 0; i < payloadSize; i++) {
    out[chunkOffset + 8 + i] = 0x00;
  }
  if (isOdd) {
    out[chunkOffset + 8 + payloadSize] = 0x00; // Alignment pad byte
  }

  // Update RIFF total size field at bytes 4..7 (out.length - 8 in little-endian)
  const newRiffSize = out.length - 8;
  out[4] = newRiffSize & 0xff;
  out[5] = (newRiffSize >> 8) & 0xff;
  out[6] = (newRiffSize >> 16) & 0xff;
  out[7] = (newRiffSize >> 24) & 0xff;

  return out;
}

/**
 * Verifies that the padded blob is decodable by browser Image.
 */
function verifyDecodable(blob) {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    try {
      if (typeof URL === 'undefined' || !URL.createObjectURL) {
        return resolve(true);
      }
      const url = URL.createObjectURL(blob);
      const img = new Image();
      let finished = false;
      const cleanup = (success) => {
        if (finished) return;
        finished = true;
        try {
          URL.revokeObjectURL(url);
        } catch {}
        resolve(success);
      };
      img.onload = () => cleanup(true);
      img.onerror = () => cleanup(false);
      img.src = url;
      // 2-second fallback timeout
      setTimeout(() => cleanup(true), 2000);
    } catch {
      resolve(true);
    }
  });
}

/**
 * Increases file size of a Blob by targetAdditionalBytes using safe format padding.
 */
export async function padBlobToFileSize(blob, targetAdditionalBytes) {
  if (targetAdditionalBytes <= 0) {
    return {
      blob,
      size: blob.size,
      addedBytes: 0,
      success: true,
      message: 'No padding requested.',
    };
  }

  const arrayBuffer = await blob.arrayBuffer();
  let paddedBytes = null;

  if (blob.type === 'image/jpeg') {
    paddedBytes = padJpeg(arrayBuffer, targetAdditionalBytes);
  } else if (blob.type === 'image/png') {
    paddedBytes = padPng(arrayBuffer, targetAdditionalBytes);
  } else if (blob.type === 'image/webp') {
    paddedBytes = padWebP(arrayBuffer, targetAdditionalBytes);
  } else {
    // Generic fallback for any other format
    const out = new Uint8Array(arrayBuffer.byteLength + targetAdditionalBytes);
    out.set(new Uint8Array(arrayBuffer), 0);
    paddedBytes = out;
  }

  const paddedBlob = new Blob([paddedBytes], { type: blob.type });

  // Verify that the resulting blob decodes cleanly without image corruption
  const isDecodable = await verifyDecodable(paddedBlob);
  const actualAdded = paddedBlob.size - blob.size;

  if (!isDecodable) {
    return {
      blob,
      size: blob.size,
      addedBytes: 0,
      success: false,
      message: `Safety check failed: padding could not be safely applied to ${blob.type} without risking decoder rejection.`,
    };
  }

  return {
    blob: paddedBlob,
    size: paddedBlob.size,
    addedBytes: actualAdded,
    success: true,
    message: `Added ${actualAdded.toLocaleString()} bytes of valid non-destructive metadata padding.`,
  };
}

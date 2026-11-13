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
 * Pads a JPEG buffer with valid COM (0xFF 0xFE) comment marker segments.
 */
function padJpeg(buffer, targetAdditionalBytes) {
  const u8 = new Uint8Array(buffer);
  // Find EOI marker 0xFF 0xD9 near end
  let eoiIndex = -1;
  for (let i = u8.length - 2; i >= 0; i--) {
    if (u8[i] === 0xff && u8[i + 1] === 0xd9) {
      eoiIndex = i;
      break;
    }
  }

  if (eoiIndex === -1) {
    // If no EOI found, append trailing safe padding
    const out = new Uint8Array(u8.length + targetAdditionalBytes);
    out.set(u8, 0);
    return out;
  }

  // Each COM segment has 4 bytes header (0xFF 0xFE + 2 bytes len). Max length is 65535 (65531 payload).
  let remaining = Math.max(0, targetAdditionalBytes);
  const segments = [];

  while (remaining > 0) {
    const chunkLen = Math.min(remaining, 65531);
    const segTotal = Math.max(4, chunkLen + 4);
    const seg = new Uint8Array(segTotal);
    seg[0] = 0xff;
    seg[1] = 0xfe;
    const lenField = segTotal - 2;
    seg[2] = (lenField >> 8) & 0xff;
    seg[3] = lenField & 0xff;
    // Fill with benign ASCII filler
    for (let j = 4; j < segTotal; j++) {
      seg[j] = 0x20; // space character
    }
    segments.push(seg);
    remaining -= segTotal;
  }

  const totalSegmentBytes = segments.reduce((acc, s) => acc + s.length, 0);
  const out = new Uint8Array(u8.length + totalSegmentBytes);

  // Copy up to EOI
  out.set(u8.subarray(0, eoiIndex), 0);
  let cur = eoiIndex;
  // Insert comment segments
  for (const seg of segments) {
    out.set(seg, cur);
    cur += seg.length;
  }
  // Copy EOI and any remaining bytes
  out.set(u8.subarray(eoiIndex), cur);

  return out;
}

/**
 * Pads a PNG buffer with an ancillary 'tEXt' chunk before IEND.
 */
function padPng(buffer, targetAdditionalBytes) {
  const u8 = new Uint8Array(buffer);
  // Find IEND chunk (12 bytes: 0 0 0 0 I E N D + 4 bytes crc)
  let iendIndex = -1;
  for (let i = u8.length - 8; i >= 8; i--) {
    if (
      u8[i] === 0x49 &&
      u8[i + 1] === 0x45 &&
      u8[i + 2] === 0x4e &&
      u8[i + 3] === 0x44
    ) {
      iendIndex = i - 4; // start of IEND length
      break;
    }
  }

  if (iendIndex === -1) {
    // Fallback: append trailing data
    const out = new Uint8Array(u8.length + targetAdditionalBytes);
    out.set(u8, 0);
    return out;
  }

  // Chunk format: 4 bytes length, 4 bytes type ('tEXt'), length bytes data, 4 bytes CRC
  // Overhead is 12 bytes. Keyword e.g. "Padding\0" is 8 bytes.
  const overhead = 12 + 8;
  const payloadDataLen = Math.max(8, targetAdditionalBytes - 12);
  const textPayloadLen = payloadDataLen - 8;

  const chunk = new Uint8Array(12 + payloadDataLen);
  // Length
  chunk[0] = (payloadDataLen >>> 24) & 0xff;
  chunk[1] = (payloadDataLen >>> 16) & 0xff;
  chunk[2] = (payloadDataLen >>> 8) & 0xff;
  chunk[3] = payloadDataLen & 0xff;
  // Type 'tEXt' (ASCII 116, 69, 88, 116)
  chunk[4] = 0x74;
  chunk[5] = 0x45;
  chunk[6] = 0x58;
  chunk[7] = 0x74;
  // Keyword "Padding\0"
  const keyword = [0x50, 0x61, 0x64, 0x64, 0x69, 0x6e, 0x67, 0x00];
  chunk.set(keyword, 8);
  // Padding data
  for (let i = 16; i < 8 + payloadDataLen; i++) {
    chunk[i] = 0x20;
  }
  // CRC-32 over type + data (from index 4 to 4 + 4 + payloadDataLen)
  const crcVal = crc32(chunk, 4, 4 + payloadDataLen);
  const crcOffset = 8 + payloadDataLen;
  chunk[crcOffset] = (crcVal >>> 24) & 0xff;
  chunk[crcOffset + 1] = (crcVal >>> 16) & 0xff;
  chunk[crcOffset + 2] = (crcVal >>> 8) & 0xff;
  chunk[crcOffset + 3] = crcVal & 0xff;

  const out = new Uint8Array(u8.length + chunk.length);
  out.set(u8.subarray(0, iendIndex), 0);
  out.set(chunk, iendIndex);
  out.set(u8.subarray(iendIndex), iendIndex + chunk.length);

  return out;
}

/**
 * Pads a WebP (RIFF) buffer by inserting a standard ancillary metadata chunk.
 */
function padWebP(buffer, targetAdditionalBytes) {
  const u8 = new Uint8Array(buffer);
  if (u8.length < 12) return u8;

  // RIFF container: [0..3: RIFF], [4..7: FileSize - 8], [8..11: WEBP]
  // Append custom RIFF chunk 'pad ' (FourCC: 0x70 0x61 0x64 0x20)
  const payloadSize = Math.max(0, targetAdditionalBytes - 8);
  const chunkHeaderSize = 8;
  const isOdd = payloadSize % 2 !== 0;
  const totalChunkSize = chunkHeaderSize + payloadSize + (isOdd ? 1 : 0);

  const out = new Uint8Array(u8.length + totalChunkSize);
  out.set(u8, 0);

  const chunkOffset = u8.length;
  // FourCC: 'pad '
  out[chunkOffset] = 0x70;
  out[chunkOffset + 1] = 0x61;
  out[chunkOffset + 2] = 0x64;
  out[chunkOffset + 3] = 0x20;
  // Size in little endian
  out[chunkOffset + 4] = payloadSize & 0xff;
  out[chunkOffset + 5] = (payloadSize >> 8) & 0xff;
  out[chunkOffset + 6] = (payloadSize >> 16) & 0xff;
  out[chunkOffset + 7] = (payloadSize >> 24) & 0xff;
  // Payload
  for (let i = 0; i < payloadSize; i++) {
    out[chunkOffset + 8 + i] = 0x20;
  }
  if (isOdd) {
    out[chunkOffset + 8 + payloadSize] = 0x00; // padding byte
  }

  // Update RIFF total size field at bytes 4..7 (little endian)
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
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
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
    // If strict decodable verification fails, fall back to original
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

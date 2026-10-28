// Product photos uploaded from the admin panel are kept in the database, so every API replica can serve them.
// The type comes from the file's first bytes, never from what the browser claims.
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function imageType(data) {
  if (data.subarray(0, 8).equals(PNG)) return 'image/png';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

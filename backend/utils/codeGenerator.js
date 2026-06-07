// Removed ambiguous characters (0, O, 1, I, l)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random alphanumeric code
 * @param {number} length - Length of code (default 6)
 * @returns {string} Uppercase code
 */
exports.generateCode = (length = 6) => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
};

/**
 * Create URL-friendly slug from a name
 */
exports.slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
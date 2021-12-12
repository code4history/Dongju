const sanitize = require('sanitize-filename')
const crypto = require('crypto')

module.exports = function sanitizeId (tilesetId) {
  const sanitizedFilename = sanitize(tilesetId)
  if (sanitizedFilename.length <= 10) {
    return sanitizedFilename
  }
  const filenameHash = crypto.createHash('md5').update(sanitizedFilename).digest('hex')
  return 'composite.' + filenameHash.slice(0, 8)
}

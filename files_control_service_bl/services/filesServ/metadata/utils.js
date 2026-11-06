const path = require('path');
const { SUPPORTED_TYPES, MIME_TYPES_MAP } = require('./constants');

function getFileType(mimeType) {
    for (const [type, types] of Object.entries(SUPPORTED_TYPES)) {
        if (types.includes(mimeType)) return type;
    }
    return null;
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES_MAP[ext] || 'application/octet-stream';
}

module.exports = { getFileType, getMimeType };
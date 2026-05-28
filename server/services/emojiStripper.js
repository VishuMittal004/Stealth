const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

function stripEmojis(value) {
  if (typeof value === 'string') return value.replace(EMOJI_REGEX, '').trim();
  if (Array.isArray(value)) return value.map(stripEmojis);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, stripEmojis(val)]));
  }
  return value;
}

module.exports = { stripEmojis, EMOJI_REGEX };

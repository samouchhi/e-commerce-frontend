export const normalizeCambodianPhone = (value) => {
  const compact = String(value ?? '')
    .trim()
    .replace(/[\s()-]/g, '')

  const local = compact.startsWith('+855') ? `0${compact.slice(4)}` : compact
  return /^0[1-9]\d{7,8}$/.test(local) ? local : null
}

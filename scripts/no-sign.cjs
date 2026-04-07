/**
 * No-op sign function for electron-builder.
 * Skips code signing (no certificate needed for personal use).
 */
module.exports = async (_config) => {
  // No signing — app will show SmartScreen warning on first run only.
}

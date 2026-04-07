/**
 * Spawns electron-builder with code signing disabled.
 * Avoids the winCodeSign symlink extraction failure on Windows without Developer Mode.
 */
const { spawnSync } = require('child_process')

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
process.env.WIN_CSC_LINK = ''
process.env.CSC_LINK = ''

const args = process.argv.slice(2)
const result = spawnSync(
  'node',
  [require.resolve('electron-builder/out/cli/cli.js'), ...args],
  { stdio: 'inherit', env: process.env, shell: true }
)

process.exit(result.status ?? 0)

/**
 * Ensures the platform-specific Codex CLI binary is installed.
 * Vercel and some CI systems skip optional dependencies, but
 * @openai/codex-sdk needs the native binary to function.
 */
const { execSync } = require('child_process');
const { platform, arch } = process;

const targets = {
  'linux-x64': '@openai/codex-linux-x64@"npm:@openai/codex@0.107.0-linux-x64"',
  'linux-arm64': '@openai/codex-linux-arm64@"npm:@openai/codex@0.107.0-linux-arm64"',
  'darwin-x64': '@openai/codex-darwin-x64@"npm:@openai/codex@0.107.0-darwin-x64"',
  'darwin-arm64': '@openai/codex-darwin-arm64@"npm:@openai/codex@0.107.0-darwin-arm64"',
};

const key = `${platform}-${arch}`;
const pkg = targets[key];

if (!pkg) {
  console.log(`[codex-binary] No binary available for ${key}, skipping.`);
  process.exit(0);
}

// Check if already installed
try {
  require.resolve(`@openai/codex-${key}/package.json`);
  console.log(`[codex-binary] @openai/codex-${key} already installed.`);
  process.exit(0);
} catch {}

console.log(`[codex-binary] Installing @openai/codex-${key}...`);
try {
  execSync(`npm install --no-save ${pkg}`, { stdio: 'inherit' });
  console.log(`[codex-binary] Done.`);
} catch (e) {
  console.warn(`[codex-binary] Failed to install, Codex SDK may not work:`, e.message);
}

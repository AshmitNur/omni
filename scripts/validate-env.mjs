import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fileEnv = {};

function loadEnvFile(fileName) {
  const envFile = resolve(process.cwd(), fileName);
  if (!existsSync(envFile)) return;

  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    fileEnv[key.trim()] = valueParts.join('=').trim();
  }
}

loadEnvFile('.env');
loadEnvFile('.env.production');

const required = ['VITE_X_BLOCKS_KEY'];
const missing = required.filter((key) => !(process.env[key] || fileEnv[key]));

if (missing.length) {
  console.error(`Missing required build environment variable(s): ${missing.join(', ')}`);
  console.error('Set them in the deployment environment before building OMNI.');
  process.exit(1);
}

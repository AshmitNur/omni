const DEFAULT_BLOCKS_API_URL = 'https://api.seliseblocks.com';
const DEFAULT_PROJECT_SLUG = 'dryzkn';

function readEnvValue(name: string) {
  const value = import.meta.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function readRequiredEnvValue(name: string) {
  const value = readEnvValue(name);
  if (!value) {
    throw new Error(`${name} is not configured. Set it in the deployment environment and rebuild OMNI.`);
  }
  return value;
}

export const BLOCKS_API_BASE = (readEnvValue('VITE_BLOCKS_API_URL') || DEFAULT_BLOCKS_API_URL).replace(/\/$/, '');
export const BLOCKS_PROJECT_KEY = readRequiredEnvValue('VITE_X_BLOCKS_KEY');
export const BLOCKS_PROJECT_SLUG = readEnvValue('VITE_PROJECT_SLUG') || DEFAULT_PROJECT_SLUG;
export const MCP_PROXY_URL = readEnvValue('VITE_MCP_PROXY_URL').replace(/\/$/, '');

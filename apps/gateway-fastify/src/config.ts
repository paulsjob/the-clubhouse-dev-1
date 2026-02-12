
import process from 'node:process';
import os from 'node:os';
import path from 'node:path';

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  orgKeys: Record<string, string>;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  // ITEM 10: Persistence
  persistEnabled: boolean;
  persistDir: string;
  persistIncludeSecrets: boolean;
  // ITEM 11: Documentation
  docsEnabled: boolean;
  docsRoutePrefix: string;
}

const parseOrgKeys = (json?: string): Record<string, string> => {
  if (!json) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ GATEWAY_ORG_KEYS_JSON missing. Falling back to dev defaults.');
      return { "org_demo": "devkey_123" };
    }
    return {};
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('❌ Failed to parse GATEWAY_ORG_KEYS_JSON', e);
    return {};
  }
};

const parseCorsOrigins = (str?: string): string[] => {
  if (!str) return ['http://localhost:5173', 'http://localhost:3000'];
  return str.split(',').map(s => s.trim());
};

const nodeEnv = (process.env.NODE_ENV as any) || 'development';

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '8787', 10),
  nodeEnv,
  orgKeys: parseOrgKeys(process.env.GATEWAY_ORG_KEYS_JSON),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  persistEnabled: process.env.PERSIST_ENABLED ? process.env.PERSIST_ENABLED === 'true' : nodeEnv !== 'production',
  persistDir: process.env.PERSIST_DIR || path.join(os.tmpdir(), 'rl-gateway-store'),
  persistIncludeSecrets: nodeEnv === 'production' ? false : process.env.PERSIST_INCLUDE_SECRETS === 'true',
  // ITEM 11: Defaults
  docsEnabled: process.env.DOCS_ENABLED ? process.env.DOCS_ENABLED === 'true' : nodeEnv !== 'production',
  docsRoutePrefix: process.env.DOCS_ROUTE_PREFIX || '/docs',
};

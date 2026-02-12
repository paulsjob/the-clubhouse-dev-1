import process from 'node:process';

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  orgKeys: Record<string, string>;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
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

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '8787', 10),
  nodeEnv: (process.env.NODE_ENV as any) || 'development',
  orgKeys: parseOrgKeys(process.env.GATEWAY_ORG_KEYS_JSON),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};
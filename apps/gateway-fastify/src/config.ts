import process from 'node:process';

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '8787', 10),
  nodeEnv: (process.env.NODE_ENV as any) || 'development'
};
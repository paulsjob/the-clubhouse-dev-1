
export type LiveSessionStatus = "initializing" | "active" | "stalled" | "terminated";

export interface LiveSession {
  id: string;
  orgId: string;
  name: string;
  resourceId: string;
  credentialId?: string;
  pollIntervalMs: number;
  topics: string[];
  path: string;
  query?: Record<string, string>;
  transform: string;
  status: LiveSessionStatus;
  startedAt?: number;
  lastPublishedAt?: number;
  lastError?: string;
  consecutiveFailures: number;
}

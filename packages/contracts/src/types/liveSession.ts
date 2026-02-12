
export type LiveSessionStatus = "initializing" | "active" | "stalled" | "terminated";

export interface LiveSession {
  id: string;
  orgId: string;
  outputId: string;
  key: string;
  params: Record<string, any>;
  mode: string;
  status: LiveSessionStatus;
  startedAt: number;
  lastHeartbeatAt: number;
}

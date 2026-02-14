
export interface SimulationConfigV1 {
  simulationId: string;
  topic: string;
  intervalMs: number;
  metadata?: Record<string, any>;
}

export interface SimulationStatusV1 {
  orgId: string;
  simulationId: string;
  topic: string;
  isActive: boolean;
  ticks: number;
  lastTickAt?: number;
}

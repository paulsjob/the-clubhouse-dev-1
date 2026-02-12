
export type OutputType = "endpoint" | "topic";

export interface Output {
  id: string;
  orgId: string;
  name: string;
  graphId: string;
  type: OutputType;
  config: Record<string, any>;
  isActive: boolean;
}


export type ResourceMode = "http" | "stream" | "webhook";

export interface Resource {
  id: string;
  orgId: string;
  name: string;
  provider: string;
  mode: ResourceMode;
  requestTemplate: Record<string, any>;
  paramsSchema: Record<string, any>;
  credentialType: string;
  samples?: any[];
  inferredSchema?: Record<string, any>;
  isActive: boolean;
}

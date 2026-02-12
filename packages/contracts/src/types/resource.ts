
export type ResourceMode = "http" | "stream" | "webhook";

export interface Resource {
  id: string;
  orgId: string;
  name: string;
  baseUrl: string;
  providerHint?: string;
  mode: ResourceMode;
  requestTemplate: Record<string, any>;
  paramsSchema: Record<string, any>;
  credentialType: string;
  samples?: any[];
  inferredSchema?: Record<string, any>;
  isActive: boolean;
  defaultHeaders?: Record<string, string>;
}

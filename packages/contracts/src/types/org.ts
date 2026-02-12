
export interface Organization {
  id: string; // This is the orgId
  name: string;
  apiKey: string;
  createdAt: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

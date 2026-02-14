
export interface BindingSourceV1 {
  kind: "output" | "topic";
  outputId?: string;
  topic?: string;
}

export interface BindingRuleV1 {
  transform?: string;
  format?: {
    type: "none" | "clock" | "number" | "string";
    options?: Record<string, any>;
  };
}

export interface BindingEntryV1 {
  id: string;
  orgId: string;
  layoutId: string;
  elementId: string;
  source: BindingSourceV1;
  path: string;
  valueType?: string;
  rules?: BindingRuleV1;
  createdAt: number;
  updatedAt: number;
}

export interface BindingSetV1 {
  id: string;
  orgId: string;
  name: string;
  layoutId: string;
  bindings: BindingEntryV1[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

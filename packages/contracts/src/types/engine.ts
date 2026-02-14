
import { Graph } from './graph';

export interface EngineErrorV1 {
  code: string;
  message: string;
  nodeId?: string;
}

export interface EngineValidateRequestV1 {
  graphId?: string;
  graph?: Graph;
}

export interface EngineValidateResponseV1 {
  valid: boolean;
  errors: EngineErrorV1[];
}

export interface EngineTraceEventV1 {
  nodeId: string;
  phase: 'input' | 'processing' | 'output' | 'error';
  ts: number;
  input?: any;
  output?: any;
  error?: string;
}

export interface EngineRunRequestV1 {
  graphId?: string;
  graph?: Graph;
  params?: Record<string, any>;
  trace?: boolean;
}

export interface EngineRunResponseV1 {
  finalOutput: any;
  traceId: string;
  traceEvents?: EngineTraceEventV1[];
}

export interface FunctionDescriptorV1 {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  category: 'logic' | 'math' | 'transform' | 'domain';
}

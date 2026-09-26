// ArchMark IR — semantic model (no layout, no SVG).
export type NodeKind =
  | 'actor'
  | 'service'
  | 'app'
  | 'database'
  | 'cache'
  | 'queue'
  | 'gateway'
  | 'worker'
  | 'storage'
  | 'model'
  | 'external'
  | 'boundary'
  | 'cluster'
  | 'cloud'
  | 'region'
  | 'browser'
  | 'mobile'
  | 'api'
  | 'server'
  | 'agent'
  | 'function'
  | 'container'
  | 'network'
  | 'filesystem';

export const NODE_KINDS: readonly NodeKind[] = [
  'actor',
  'service',
  'app',
  'database',
  'cache',
  'queue',
  'gateway',
  'worker',
  'storage',
  'model',
  'external',
  'boundary',
  'cluster',
  'cloud',
  'region',
  'browser',
  'mobile',
  'api',
  'server',
  'agent',
  'function',
  'container',
  'network',
  'filesystem',
];

export interface ArchNode {
  id: string;
  kind: NodeKind;
  label: string;
  group?: string;
}
export interface ArchEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}
export interface ArchGroup {
  id: string;
  label: string;
  members: string[];
}
export type FlowStepType = 'request' | 'response' | 'write' | 'read' | 'event' | 'error' | 'failure' | 'recovery';
export interface ArchFlowStep {
  from: string;
  to: string;
  type?: FlowStepType;
  line: number;
}
export interface ArchFlow {
  id: string;
  loop: boolean;
  steps: ArchFlowStep[];
  // DSL-relative line of the `flow <id> {` header. Attached deliberately (not parser
  // trivia): flow-level diagnostics (empty flow, step caps, timeline errors) must point
  // at user source. Steps carry their own lines for step-level diagnostics.
  line: number;
}
export interface ArchModel {
  nodes: ArchNode[];
  edges: ArchEdge[];
  groups: ArchGroup[];
  flows: ArchFlow[];
}

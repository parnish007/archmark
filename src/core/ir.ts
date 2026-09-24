// ArchMark IR — semantic model (no layout, no SVG).
export type NodeKind =
  | 'actor' | 'service' | 'app' | 'database' | 'cache' | 'queue'
  | 'gateway' | 'worker' | 'storage' | 'model' | 'external'
  | 'boundary' | 'cluster' | 'cloud' | 'region'
  | 'browser' | 'mobile' | 'api' | 'server' | 'agent' | 'function'
  | 'container' | 'network' | 'filesystem';

export const NODE_KINDS: readonly NodeKind[] = [
  'actor','service','app','database','cache','queue','gateway','worker',
  'storage','model','external','boundary','cluster','cloud','region',
  'browser','mobile','api','server','agent','function','container','network','filesystem',
];

export interface ArchNode { id: string; kind: NodeKind; label: string; group?: string }
export interface ArchEdge { id: string; from: string; to: string; label?: string }
export interface ArchGroup { id: string; label: string; members: string[] }
export type FlowStepType = 'request' | 'response' | 'write' | 'read' | 'event' | 'error';
export interface ArchFlowStep { from: string; to: string; type?: FlowStepType }
export interface ArchFlow { id: string; steps: ArchFlowStep[] }
export interface ArchModel { nodes: ArchNode[]; edges: ArchEdge[]; groups: ArchGroup[]; flows: ArchFlow[] }

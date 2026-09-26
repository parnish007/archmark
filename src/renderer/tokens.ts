// Calm Technical Precision tokens v0.
export type ArrowKind = 'filled' | 'chevron';
export interface Theme {
  bg: string;
  ink: string;
  edge: string;
  muted: string;
  accent: string;
  danger: string;
  grid: string;
  nodeFill: string;
  // Style contract (v1 visual system): every renderer styling decision reads from
  // these fields — no hardcoded geometry in scene serialization. LIGHT/DARK below
  // carry the shipping values; experimental directions override per-field.
  nodeBorder: string;
  nodeRadius: number;
  nodeStroke: number;
  nodeLabelSize: number;
  nodeLabelWeight: number;
  cylinderStores: boolean; // database/storage render as vessel cylinders
  edgeStroke: number;
  arrowKind: ArrowKind;
  arrowSize: number; // marker viewport box (height = size * 0.75)
  cornerRadius: number; // orthogonal edge corner rounding; 0 = sharp
  groupRadius: number;
  groupStroke: number;
  groupDash: string;
  groupBorder: string;
  groupWash: string;
  groupWashOpacity: number;
  groupLabelSize: number;
  groupBadge: boolean; // pill badge label vs plain uppercase text
  badgeFill: string;
  badgeInk: string;
  edgeLabelSize: number;
  iconScale: number; // 20/24 flatten factor
}
export const LIGHT: Theme = {
  bg: '#FFFFFF',
  ink: '#1A2330',
  edge: '#4A5A6E',
  muted: '#8A97A8',
  accent: '#2563EB',
  danger: '#C0392B',
  grid: '#EEF1F5',
  nodeFill: '#FFFFFF',
  nodeBorder: '#1A2330',
  nodeRadius: 10,
  nodeStroke: 1.5,
  nodeLabelSize: 13,
  nodeLabelWeight: 600,
  cylinderStores: true,
  edgeStroke: 1.5,
  arrowKind: 'chevron',
  arrowSize: 8,
  cornerRadius: 8,
  groupRadius: 12,
  groupStroke: 1,
  groupDash: 'none',
  groupBorder: '#2563EB',
  groupWash: '#2563EB',
  groupWashOpacity: 0.07,
  groupLabelSize: 10,
  groupBadge: true,
  badgeFill: '#1A2330',
  badgeInk: '#FFFFFF',
  edgeLabelSize: 10.5,
  iconScale: 0.833,
};
export const DARK: Theme = {
  bg: '#0D1117',
  ink: '#E6EDF3',
  edge: '#8B9BB0',
  muted: '#5C6A7E',
  accent: '#6AA6FF',
  danger: '#E06C5B',
  grid: '#1B2330',
  nodeFill: '#161D27',
  nodeBorder: '#8B9BB0',
  nodeRadius: 10,
  nodeStroke: 1.5,
  nodeLabelSize: 13,
  nodeLabelWeight: 600,
  cylinderStores: true,
  edgeStroke: 1.5,
  arrowKind: 'chevron',
  arrowSize: 8,
  cornerRadius: 8,
  groupRadius: 12,
  groupStroke: 1,
  groupDash: 'none',
  groupBorder: '#6AA6FF',
  groupWash: '#6AA6FF',
  groupWashOpacity: 0.1,
  groupLabelSize: 10,
  groupBadge: true,
  badgeFill: '#E6EDF3',
  badgeInk: '#0D1117',
  edgeLabelSize: 10.5,
  iconScale: 0.833,
};
export const FONT_UI = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif`;

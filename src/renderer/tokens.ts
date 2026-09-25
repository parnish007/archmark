// Calm Technical Precision tokens v0.
export interface Theme {
  bg: string;
  ink: string;
  edge: string;
  muted: string;
  accent: string;
  danger: string;
  grid: string;
  nodeFill: string;
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
};
export const FONT_UI = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans',sans-serif`;
export const RADII = { node: 8, group: 12 } as const;
export const STROKE = { edge: 1.75, node: 1.5 } as const;


import React from 'react';

export interface Element {
  id: string;
  type: 'text' | 'image' | 'shape';
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
  locked?: boolean;
  data?: {
    text?: string;
    textType?: 'point' | 'area';
    verticalAlign?: 'top' | 'middle' | 'bottom';
  };
  style?: React.CSSProperties & {
    fillOpacity?: number;
    strokeOpacity?: number;
  };
  src?: string;
}

export interface Guide {
  id: string;
  type: 'h' | 'v';
  value: number;
}

export interface Layout {
  elements: Element[];
  guides?: Guide[];
}

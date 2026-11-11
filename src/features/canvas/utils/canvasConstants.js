export const ELEMENT_TYPES = {
  STICKY_NOTE: 'STICKY_NOTE',
  SHAPE: 'SHAPE',
  TEXT: 'TEXT',
  ARROW: 'ARROW',
};

export const SHAPES = {
  RECTANGLE: 'rectangle',
  ROUNDED_RECTANGLE: 'rounded_rectangle',
  ELLIPSE: 'ellipse',
  DIAMOND: 'diamond',
};

export const TOOLS = {
  SELECT: 'SELECT',
  STICKY_NOTE: 'STICKY_NOTE',
  SHAPE: 'SHAPE',
  TEXT: 'TEXT',
  ARROW: 'ARROW',
};

export const CANVAS_COLORS = [
  '#fde68a',
  '#bbf7d0',
  '#bfdbfe',
  '#fecaca',
  '#e9d5ff',
  '#fed7aa',
  '#ffffff',
  '#1e293b',
];

export const EVENT_TYPES = {
  ELEMENTS_UPSERTED: 'ELEMENTS_UPSERTED',
  ELEMENTS_DELETED: 'ELEMENTS_DELETED',
  CANVAS_RENAMED: 'CANVAS_RENAMED',
  CANVAS_DELETED: 'CANVAS_DELETED',
};

export const MIN_ELEMENT_SIZE = 0.04;
export const DEFAULT_ELEMENT_WIDTH = 0.16;
export const DEFAULT_ELEMENT_HEIGHT = 0.12;
export const DRAG_UPDATE_THROTTLE_MS = 60;

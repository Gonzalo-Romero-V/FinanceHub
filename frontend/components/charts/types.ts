export type WidgetType = "bar" | "line" | "pie" | "table" | "kpi";

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
  categoryKey?: string;
  valueKey?: string;
  metric?: string;
  subtext?: string;
}

export interface AnalysisResponse {
  intent: string;
  mode: "replace" | "append" | "update";
  widgets: Widget[];
}

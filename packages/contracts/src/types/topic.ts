
export type TopicMessageType = "snapshot" | "update" | "error";

export interface TopicMessage {
  type: TopicMessageType;
  topic: string;
  ts: number;
  payload: any;
  version: string;
}

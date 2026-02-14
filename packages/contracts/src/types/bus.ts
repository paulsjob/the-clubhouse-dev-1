
export interface BusEventV1 {
  id: string;
  topic: string;
  orgId: string;
  ts: number;
  payload: any;
}

export interface PublishRequestV1 {
  topic: string;
  payload: any;
}

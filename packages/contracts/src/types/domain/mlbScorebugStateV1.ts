
export type MLBStatus = "pre" | "live" | "final" | "delayed";
export type MLBInningHalf = "top" | "bottom";

export interface MLBTeamState {
  id: string;
  abbr: string;
  runs: number;
  hits?: number;
  errors?: number;
}

export interface MLBScorebugStateV1 {
  gameId: string;
  status: MLBStatus;
  home: MLBTeamState;
  away: MLBTeamState;
  inning: {
    number: number;
    half: MLBInningHalf;
  };
  count: {
    balls: number;
    strikes: number;
    outs: number;
  };
  bases: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
  lastEvent?: {
    type: string;
    summary: string;
    ts: number;
  };
  ts: number;
}


import { MLBScorebugStateV1 } from '@renderless/contracts';

export type TransformFn = (raw: any) => any;

const mlb_scorebug_v1: TransformFn = (raw: any): MLBScorebugStateV1 => {
  // Demo resilient mapping
  return {
    gameId: raw.gameId || raw.id || "unknown",
    status: (raw.status || "pre") as any,
    home: {
      id: raw.home?.id || "HOME",
      abbr: raw.home?.abbr || "HM",
      runs: raw.home?.runs ?? 0,
      hits: raw.home?.hits,
      errors: raw.home?.errors,
    },
    away: {
      id: raw.away?.id || "AWAY",
      abbr: raw.away?.abbr || "AW",
      runs: raw.away?.runs ?? 0,
      hits: raw.away?.hits,
      errors: raw.away?.errors,
    },
    inning: {
      number: raw.inning?.number || 1,
      half: (raw.inning?.half || "top") as any,
    },
    count: {
      balls: raw.count?.balls ?? 0,
      strikes: raw.count?.strikes ?? 0,
      outs: raw.count?.outs ?? 0,
    },
    bases: {
      first: !!raw.bases?.first,
      second: !!raw.bases?.second,
      third: !!raw.bases?.third,
    },
    ts: Date.now()
  };
};

export const transformRegistry: Record<string, TransformFn> = {
  mlb_scorebug_v1,
  passthrough: (raw) => raw
};


import { ResourceSchema } from './validators/resource';
import { MLBScorebugStateV1Schema } from './validators/domain/mlbScorebugStateV1';
import { Resource } from './types/resource';
import { MLBScorebugStateV1 } from './types/domain/mlbScorebugStateV1';

const sampleResource: Resource = {
  id: "res_123",
  orgId: "org_456",
  name: "MLB Live Feed",
  provider: "sportradar",
  mode: "http",
  requestTemplate: { url: "https://api.example.com/mlb" },
  paramsSchema: { gameId: "string" },
  credentialType: "api_key",
  isActive: true
};

const sampleMLBState: MLBScorebugStateV1 = {
  gameId: "game_789",
  status: "live",
  home: { id: "SEA", abbr: "SEA", runs: 4, hits: 8, errors: 0 },
  away: { id: "SF", abbr: "SF", runs: 2, hits: 5, errors: 1 },
  inning: { number: 7, half: "bottom" },
  count: { balls: 3, strikes: 2, outs: 2 },
  bases: { first: true, second: false, third: true },
  ts: Date.now()
};

function runTest() {
  console.log("Starting contract validation tests...");

  try {
    ResourceSchema.parse(sampleResource);
    console.log("✅ Resource validation passed.");
  } catch (err) {
    console.error("❌ Resource validation failed:", err);
    process.exit(1);
  }

  try {
    MLBScorebugStateV1Schema.parse(sampleMLBState);
    console.log("✅ MLB Scorebug State validation passed.");
  } catch (err) {
    console.error("❌ MLB Scorebug State validation failed:", err);
    process.exit(1);
  }

  console.log("All tests completed successfully.");
}

runTest();

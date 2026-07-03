import { loadConfig } from "../src/server/config.js";
import { SteamClient } from "../src/server/steam-client.js";

const config = loadConfig();
const client = new SteamClient(config.steamApiKey);
const discovery = await client.discoverFromApi(config.steamId);
const appIds = new Set(
  discovery.files.flatMap((file) => {
    const value = file.consumer_appid ?? file.consumer_app_id;
    return typeof value === "number" || typeof value === "string" ? [String(value)] : [];
  }),
);

for (const requiredAppId of ["294100", "529340"]) {
  if (!appIds.has(requiredAppId)) throw new Error(`GetUserFiles did not return required AppID ${requiredAppId}.`);
}

const ids = discovery.files
  .map((file) => String(file.publishedfileid || ""))
  .filter((id) => /^\d+$/.test(id))
  .slice(0, 3);
if (ids.length < 3) throw new Error("Fewer than three Workshop items were returned.");

const details = await client.getKeyedDetails(ids);
for (const id of ids) {
  const detail = details.find((candidate) => String(candidate.publishedfileid) === id);
  const voteData = detail?.vote_data;
  if (
    !voteData ||
    !Number.isFinite(Number(voteData.votes_up)) ||
    !Number.isFinite(Number(voteData.votes_down)) ||
    !Number.isFinite(Number(voteData.score))
  ) {
    throw new Error(`Vote data contract failed for Workshop item ${id}.`);
  }
}

console.log(`Steam contract passed for ${discovery.files.length} items across ${appIds.size} apps.`);

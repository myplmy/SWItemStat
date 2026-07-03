import { SteamClient } from "../src/server/steam-client.js";

const client = new SteamClient("unused-for-public-smoke-test");
const discovery = await client.discoverFromHtml("myplmy");
const candidateIds = discovery.files
  .map((file) => String(file.publishedfileid || ""))
  .filter((id) => /^\d+$/.test(id))
  .slice(0, 30);

if (candidateIds.length < 3) throw new Error("Public Workshop page returned fewer than three items.");
const details = await client.getPublicDetails(candidateIds);
const ownedDetails = details
  .filter((detail) => String(detail.creator) === "76561197991373987")
  .slice(0, 3);

if (ownedDetails.length < 3) throw new Error("Fewer than three owned public items were returned.");
for (const detail of ownedDetails) {
  const id = String(detail.publishedfileid);
  if (
    !Number.isFinite(Number(detail.views)) ||
    !Number.isFinite(Number(detail.subscriptions)) ||
    !Number.isFinite(Number(detail.lifetime_subscriptions))
  ) {
    throw new Error(`Public detail contract failed for Workshop item ${id}.`);
  }
}

console.log(
  `Public Steam smoke test passed for ${discovery.files.length} discovered items and ${ownedDetails.length} owned details.`,
);

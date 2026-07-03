import { describe, expect, it } from "vitest";
import { parseWorkshopHtml } from "../src/server/steam-client.js";

describe("parseWorkshopHtml", () => {
  it("extracts apps, item ids, and pagination", () => {
    const html = `
      <div id="sharedfiles_filterselect_app_option_2"
        onclick="SelectSharedFilesContentFilter({ 'appid': '294100' });">RimWorld</div>
      <a class="ugc" data-appid="294100" data-publishedfileid="3613716591"></a>
      <div class="workshopBrowsePagingControls">
        <a class="pagelink" href="?p=3">3</a>
      </div>`;
    const parsed = parseWorkshopHtml(html);
    expect(parsed.apps.get("294100")).toBe("RimWorld");
    expect(parsed.files).toEqual([{ publishedfileid: "3613716591", consumer_appid: "294100" }]);
    expect(parsed.totalPages).toBe(3);
  });
});

// Metropolitan Museum of Art adapter (open Collection API, openly-served images). { items, meta }.
import { viaProxy, isJsonObject } from "/_rt/feed.js";
const API = "https://collectionapi.metmuseum.org/public/collection/v1";
const SEARCH = `${API}/search?q=painting&hasImages=true&isHighlight=true`;
export async function load() {
  const ids = (JSON.parse(await viaProxy(SEARCH, isJsonObject)).objectIDs || []).slice(0, 28);
  const objs = await Promise.all(ids.map((id) =>
    viaProxy(`${API}/objects/${id}`, isJsonObject).then(JSON.parse).catch(() => null)
  ));
  const items = objs.filter((o) => o && o.primaryImageSmall).map((o) => ({
    id: String(o.objectID),
    title: o.title || "—",
    artist: o.artistDisplayName || "",
    medium: o.medium || "",
    date: o.objectDate || "",
    thumb: o.primaryImageSmall,
    full: o.primaryImage || o.primaryImageSmall,
  }));
  return { items, meta: {} };
}

async function getAssetsFromManifest() {
  try {
    const res = await fetch("cache.manifest");
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    let inCacheSection = false;
    const assets = [];
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;
      if (line === "CACHE:") {
        inCacheSection = true;
        continue;
      }
      if (line.endsWith(":") || line === "NETWORK:") {
        inCacheSection = false;
        continue;
      }
      if (inCacheSection && line !== "*") {
        assets.push(line);
      }
    }
    return assets;
  } catch (e) {
    return [];
  }
}

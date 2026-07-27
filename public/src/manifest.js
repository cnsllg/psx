async function getAssetsFromManifest() {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "cache.manifest", true);
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 0) {
        const text = xhr.responseText;
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
        resolve(assets);
      } else {
        resolve([]);
      }
    };
    xhr.onerror = function () {
      resolve([]);
    };
    xhr.send();
  });
}

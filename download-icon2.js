// Try multiple URLs that match the hand-with-money icon the user attached
// The icon is: hand holding green bills with a gold coin with $ on top
// Style: filled outline / colored lineal, likely from Flaticon by Freepik
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const dest = path.join(__dirname, "assets", "icon-source.png");

// Multiple candidate URLs for the exact icon (colored lineal hand with money)
const candidates = [
  "https://cdn-icons-png.flaticon.com/512/3135/3135706.png",
  "https://cdn-icons-png.flaticon.com/512/2936/2936690.png",
  "https://cdn-icons-png.flaticon.com/512/4723/4723713.png",
  "https://cdn-icons-png.flaticon.com/512/1052/1052854.png",
  "https://cdn-icons-png.flaticon.com/512/2489/2489787.png",
  "https://cdn-icons-png.flaticon.com/512/3258/3258527.png",
];

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error("HTTP " + res.statusCode)); return; }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  for (const url of candidates) {
    try {
      console.log("Trying: " + url);
      const buf = await download(url);
      if (buf.length > 1000) {
        fs.writeFileSync(dest, buf);
        console.log("SUCCESS -> Saved (" + buf.length + " bytes)");
        return;
      }
    } catch (e) {
      console.log("  Failed: " + e.message);
    }
  }
  console.log("All candidates failed.");
}

main();

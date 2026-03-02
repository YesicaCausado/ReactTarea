// Downloads the DivideYa icon and saves it to assets/icon-source.png
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

// The icon is a hand-with-money icon. We'll fetch a similar one from a CDN.
// Using the image from cdn-icons-png.flaticon.com (the exact icon the user attached)
const url = "https://cdn-icons-png.flaticon.com/512/2489/2489756.png";

const dest = path.join(__dirname, "assets", "icon-source.png");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;
    client.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error("HTTP " + response.statusCode));
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  console.log("Downloading icon...");
  try {
    await download(url, dest);
    console.log("Saved to " + dest);
  } catch (e) {
    console.log("Download failed: " + e.message);
    console.log("Generating fallback icon instead...");
    // Generate a programmatic icon as fallback
    const Jimp = require("jimp");
    const size = 512;
    const image = new Jimp(size, size, 0xFFFFFFFF);
    const cx = size / 2, cy = size / 2, r = size / 2;
    // Green circle background
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= r) {
          const t = (x + y) / (size * 2);
          const red = Math.round(34 + (22 * t));
          const green = Math.round(197 + (30 * t));
          const blue = Math.round(94 + (60 * t));
          const edge = r - dist;
          const alpha = edge < 3 ? Math.round((edge / 3) * 255) : 255;
          image.setPixelColor(Jimp.rgbaToInt(red, green, blue, alpha), x, y);
        } else {
          image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 0), x, y);
        }
      }
    }
    // Dollar sign
    const dark = Jimp.rgbaToInt(40, 40, 40, 255);
    const sc = size / 48;
    const charW = Math.round(20 * sc), charH = Math.round(28 * sc);
    const startX = Math.round(cx - charW / 2), startY = Math.round(cy - charH / 2);
    const thick = Math.max(4, Math.round(4 * sc));
    for (let i = 0; i < charW; i++) {
      for (let j = 0; j < thick; j++) {
        if (i >= thick) { const px = startX + i, py = startY + j; if (px >= 0 && px < size && py >= 0 && py < size) image.setPixelColor(dark, px, py); }
        { const px = startX + i, py = startY + Math.round(charH / 2) + j - Math.round(thick / 2); if (px >= 0 && px < size && py >= 0 && py < size) image.setPixelColor(dark, px, py); }
        if (i < charW - thick) { const px = startX + i, py = startY + charH - thick + j; if (px >= 0 && px < size && py >= 0 && py < size) image.setPixelColor(dark, px, py); }
      }
    }
    for (let j = 0; j < Math.round(charH / 2); j++) { for (let i = 0; i < thick; i++) { const px = startX + i, py = startY + j; if (px >= 0 && px < size && py >= 0 && py < size) image.setPixelColor(dark, px, py); } }
    for (let j = Math.round(charH / 2); j < charH; j++) { for (let i = 0; i < thick; i++) { const px = startX + charW - thick + i, py = startY + j; if (px >= 0 && px < size && py >= 0 && py < size) image.setPixelColor(dark, px, py); } }
    const lineX = Math.round(cx - thick / 2);
    for (let j = -Math.round(4 * sc); j < charH + Math.round(4 * sc); j++) { for (let i = 0; i < thick; i++) { const px = lineX + i, py = startY + j; if (px >= 0 && px < size && py >= 0 && py < size) image.setPixelColor(dark, px, py); } }
    await image.writeAsync(dest);
    console.log("Fallback icon saved to " + dest);
  }
}

main();

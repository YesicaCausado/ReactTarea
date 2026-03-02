const Jimp = require("jimp");
const path = require("path");

// Android mipmap sizes
const sizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

async function generateIcon(size) {
  const image = new Jimp(size, size, 0x00000000);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // Draw circular background with gradient-like effect
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r) {
        const t = (x + y) / (size * 2);
        const red = Math.round(110 + (96 - 110) * t);
        const green = Math.round(231 + (165 - 231) * t);
        const blue = Math.round(183 + (250 - 183) * t);
        const edgeDist = r - dist;
        const alpha = edgeDist < 2 ? Math.round((edgeDist / 2) * 255) : 255;
        image.setPixelColor(Jimp.rgbaToInt(red, green, blue, alpha), x, y);
      }
    }
  }

  // Draw $ sign
  const sc = size / 48;
  const dark = Jimp.rgbaToInt(10, 22, 40, 255);
  const charW = Math.round(20 * sc);
  const charH = Math.round(28 * sc);
  const startX = Math.round(cx - charW / 2);
  const startY = Math.round(cy - charH / 2);
  const thick = Math.max(2, Math.round(3 * sc));

  for (let i = 0; i < charW; i++) {
    for (let j = 0; j < thick; j++) {
      if (i >= thick) { const px=startX+i,py=startY+j; if(px>=0&&px<size&&py>=0&&py<size)image.setPixelColor(dark,px,py); }
      { const px=startX+i,py=startY+Math.round(charH/2)+j-Math.round(thick/2); if(px>=0&&px<size&&py>=0&&py<size)image.setPixelColor(dark,px,py); }
      if (i < charW-thick) { const px=startX+i,py=startY+charH-thick+j; if(px>=0&&px<size&&py>=0&&py<size)image.setPixelColor(dark,px,py); }
    }
  }
  for (let j=0;j<Math.round(charH/2);j++){for(let i=0;i<thick;i++){const px=startX+i,py=startY+j;if(px>=0&&px<size&&py>=0&&py<size)image.setPixelColor(dark,px,py);}}
  for (let j=Math.round(charH/2);j<charH;j++){for(let i=0;i<thick;i++){const px=startX+charW-thick+i,py=startY+j;if(px>=0&&px<size&&py>=0&&py<size)image.setPixelColor(dark,px,py);}}
  const lineX=Math.round(cx-thick/2);
  for (let j=-Math.round(3*sc);j<charH+Math.round(3*sc);j++){for(let i=0;i<thick;i++){const px=lineX+i,py=startY+j;if(px>=0&&px<size&&py>=0&&py<size)image.setPixelColor(dark,px,py);}}

  return image;
}

async function main() {
  console.log("Generating DivideYa icons...");
  for (const [folder, size] of Object.entries(sizes)) {
    const icon = await generateIcon(size);
    const resDir = path.join(__dirname,"android","app","src","main","res",folder);
    await icon.writeAsync(path.join(resDir, "ic_launcher.png"));
    await icon.writeAsync(path.join(resDir, "ic_launcher_round.png"));
    await icon.writeAsync(path.join(resDir, "ic_launcher_foreground.png"));
    console.log("  Done " + folder + ": " + size + "x" + size);
  }
  const webIcon = await generateIcon(192);
  await webIcon.writeAsync(path.join(__dirname, "public", "logo192.png"));
  const webIcon2 = await generateIcon(512);
  await webIcon2.writeAsync(path.join(__dirname, "public", "logo512.png"));
  console.log("  Done web icons");
  console.log("All icons generated!");
}

main().catch(console.error);

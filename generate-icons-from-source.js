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

async function main() {
  console.log("Loading source icon...");
  const source = await Jimp.read(path.join(__dirname, "assets", "icon-source.png"));

  console.log("Generating Android icons from source image...");
  for (const [folder, size] of Object.entries(sizes)) {
    const resDir = path.join(__dirname, "android", "app", "src", "main", "res", folder);

    // ic_launcher (standard)
    const icon = source.clone().resize(size, size, Jimp.RESIZE_BICUBIC);
    await icon.writeAsync(path.join(resDir, "ic_launcher.png"));

    // ic_launcher_round (same image, round is handled by Android adaptive icon)
    await icon.writeAsync(path.join(resDir, "ic_launcher_round.png"));

    // ic_launcher_foreground (slightly padded for adaptive icon)
    const fgSize = Math.round(size * 1.5);
    const fg = new Jimp(fgSize, fgSize, 0x00000000); // transparent
    const fgIcon = source.clone().resize(size, size, Jimp.RESIZE_BICUBIC);
    const offset = Math.round((fgSize - size) / 2);
    fg.composite(fgIcon, offset, offset);
    const fgFinal = fg.resize(size, size, Jimp.RESIZE_BICUBIC);
    await fgFinal.writeAsync(path.join(resDir, "ic_launcher_foreground.png"));

    console.log("  Done " + folder + ": " + size + "x" + size);
  }

  // Web icons
  const web192 = source.clone().resize(192, 192, Jimp.RESIZE_BICUBIC);
  await web192.writeAsync(path.join(__dirname, "public", "logo192.png"));
  const web512 = source.clone().resize(512, 512, Jimp.RESIZE_BICUBIC);
  await web512.writeAsync(path.join(__dirname, "public", "logo512.png"));
  const fav = source.clone().resize(64, 64, Jimp.RESIZE_BICUBIC);
  await fav.writeAsync(path.join(__dirname, "public", "favicon.ico"));
  console.log("  Done web icons");

  console.log("\nAll icons generated from source image!");
}

main().catch(console.error);

import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(process.cwd(), "public", "images");

interface Deal {
  imageUrl: string | null;
}

interface ScrapeResult {
  deals: Deal[];
}

function getAllReferencedImages(): Set<string> {
  const referenced = new Set<string>();

  const jsonFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith("-deals.json"));

  for (const file of jsonFiles) {
    try {
      const data = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, file), "utf-8")
      ) as ScrapeResult;

      for (const deal of data.deals) {
        if (deal.imageUrl && deal.imageUrl.startsWith("/images/")) {
          // Convert /images/store/filename.jpg to full path
          referenced.add(path.join(process.cwd(), "public", deal.imageUrl));
        }
      }
    } catch (err) {
      console.error(`Error reading ${file}:`, err);
    }
  }

  return referenced;
}

function getAllImageFiles(): string[] {
  const allImages: string[] = [];

  if (!fs.existsSync(IMAGES_DIR)) return allImages;

  const storeDirs = fs.readdirSync(IMAGES_DIR);

  for (const store of storeDirs) {
    const storeDir = path.join(IMAGES_DIR, store);
    if (!fs.statSync(storeDir).isDirectory()) continue;

    const files = fs.readdirSync(storeDir);
    for (const file of files) {
      allImages.push(path.join(storeDir, file));
    }
  }

  return allImages;
}

function cleanupOrphanedImages(): void {
  console.log("Starting image cleanup...");

  const referenced = getAllReferencedImages();
  const allImages = getAllImageFiles();

  console.log(`Found ${referenced.size} referenced images in JSON files`);
  console.log(`Found ${allImages.length} total images on disk`);

  let deletedCount = 0;

  for (const imagePath of allImages) {
    if (!referenced.has(imagePath)) {
      try {
        fs.unlinkSync(imagePath);
        deletedCount++;
        console.log(`Deleted: ${imagePath}`);
      } catch (err) {
        console.error(`Failed to delete ${imagePath}:`, err);
      }
    }
  }

  console.log(`\nCleanup complete. Deleted ${deletedCount} orphaned images.`);
}

cleanupOrphanedImages();

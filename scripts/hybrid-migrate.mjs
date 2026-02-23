import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TABLE_PATH = path.join(ROOT, 'src/content/ui/table.json');
const CONTENT_DIR = path.join(ROOT, 'content');

const tableData = JSON.parse(fs.readFileSync(TABLE_PATH, 'utf-8'));
const translations = tableData.translations || [];

function getTranslation(key, lang) {
    const entry = translations.find(t => t.key === key);
    return entry ? entry[lang] : "";
}

function processFolder(subDir, type) {
    const srcDir = path.join(CONTENT_DIR, subDir, 'de');
    const destDir = path.join(CONTENT_DIR, subDir);

    // Also look in the destDir itself if we are re-running
    const dirsToProcess = [srcDir, destDir];

    for (const currentDir of dirsToProcess) {
        if (!fs.existsSync(currentDir)) continue;

        const files = fs.readdirSync(currentDir);
        for (const file of files) {
            if (!file.endsWith('.md') || file === '.gitkeep') continue;
            if (currentDir === destDir && fs.existsSync(path.join(srcDir, file))) continue; // Skip dest if src exists to avoid collision

            const filePath = path.join(currentDir, file);
            const { data, content: body } = matter(fs.readFileSync(filePath, 'utf-8'));

            const fileName = path.basename(file, '.md').replace('.de', '');
            const baseKey = `${type}_${fileName}`;

            // Shared cleanup/migration
            if (type === 'work') {
                data.materials_de = getTranslation(`${baseKey}_materials`, 'de') || data.materials || data.materials_de || "";
                data.materials_en = getTranslation(`${baseKey}_materials`, 'en') || data.materials_en || "";
                data.dimensions_de = getTranslation(`${baseKey}_dimensions`, 'de') || data.dimensions || data.dimensions_de || "";
                data.dimensions_en = getTranslation(`${baseKey}_dimensions`, 'en') || data.dimensions_en || "";
                data.description_de = getTranslation(`${baseKey}_body`, 'de') || data.description_de || body.trim() || "";
                data.description_en = getTranslation(`${baseKey}_body`, 'en') || data.description_en || "";
            } else if (type === 'exhibition') {
                data.venue_de = getTranslation(`${baseKey}_venue`, 'de') || data.venue || data.venue_de || "";
                data.venue_en = getTranslation(`${baseKey}_venue`, 'en') || data.venue_en || "";
                data.city_de = getTranslation(`${baseKey}_city`, 'de') || data.city || data.city_de || "";
                data.city_en = getTranslation(`${baseKey}_city`, 'en') || data.city_en || "";
                data.period_de = getTranslation(`${baseKey}_period`, 'de') || data.period || data.period_de || "";
                data.period_en = getTranslation(`${baseKey}_period`, 'en') || data.period_en || "";
                data.description_de = getTranslation(`${baseKey}_body`, 'de') || data.description_de || body.trim() || "";
                data.description_en = getTranslation(`${baseKey}_body`, 'en') || data.description_en || "";
            } else if (type === 'press') {
                // Press mainly shared
            }

            delete data.translation_key_title;
            delete data.translation_key_body;
            delete data.materials;
            delete data.dimensions;
            delete data.venue;
            delete data.city;
            delete data.period;

            const newFilePath = path.join(destDir, `${fileName}.md`);
            fs.writeFileSync(newFilePath, matter.stringify("", data));
            console.log(`Processed ${type} ${file} -> ${fileName}.md`);

            if (filePath !== newFilePath) {
                fs.unlinkSync(filePath);
            }
        }
    }
}

function processPages() {
    const srcDir = path.join(CONTENT_DIR, 'pages');
    if (!fs.existsSync(srcDir)) return;

    const files = fs.readdirSync(srcDir);
    for (const file of files) {
        if ((!file.endsWith('.de.md') && !file.endsWith('.md')) || file === '.gitkeep') continue;

        const filePath = path.join(srcDir, file);
        const { data, content: body } = matter(fs.readFileSync(filePath, 'utf-8'));

        const fileName = file.replace('.de.md', '').replace('.md', '');
        const baseKey = `page_${fileName}`;

        if (!data.body_de) {
            data.body_de = getTranslation(`${baseKey}_body`, 'de') || body.trim();
            data.body_en = getTranslation(`${baseKey}_body`, 'en') || "";
        }

        delete data.translation_key_body;

        const newFilePath = path.join(srcDir, `${fileName}.md`);
        fs.writeFileSync(newFilePath, matter.stringify("", data));
        if (filePath !== newFilePath) {
            console.log(`Migrated page ${file} -> ${fileName}.md`);
            fs.unlinkSync(filePath);
        }
    }
}

console.log("Starting hybrid re-migration (improved)...");
processFolder('works', 'work');
processFolder('exhibitions', 'exhibition');
processFolder('press', 'press');
processPages();

const uiKeys = ['nav_', 'field_'];
const newTranslations = translations.filter(t => uiKeys.some(k => t.key.startsWith(k)));
fs.writeFileSync(TABLE_PATH, JSON.stringify({ translations: newTranslations }, null, 2));

console.log("Hybrid migration complete.");

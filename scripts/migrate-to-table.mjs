import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const TABLE_PATH = path.join(ROOT, 'src/content/ui/table.json');

const table = JSON.parse(fs.readFileSync(TABLE_PATH, 'utf-8'));

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function processDirectory(dir, prefix) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath, `${prefix}_${file}`);
        } else if (file.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const { data, content: body } = matter(content);
            const fileName = path.basename(file, '.md').replace('.de', '');
            const baseKey = `${prefix}_${fileName}`;

            // Title
            if (data.title) {
                addEntry(`${baseKey}_title`, `Title of ${prefix}/${file}`, data.title);
            }

            // Body
            if (body && body.trim()) {
                addEntry(`${baseKey}_body`, `Body content of ${prefix}/${file}`, body.trim());
            }

            // Other fields if applicable
            if (data.venue) addEntry(`${baseKey}_venue`, `Venue of ${prefix}/${file}`, data.venue);
            if (data.city) addEntry(`${baseKey}_city`, `City of ${prefix}/${file}`, data.city);
        }
    }
}

function addEntry(key, location, deValue) {
    const existing = table.find(e => e.key === key);
    if (!existing) {
        table.push({
            key,
            location,
            de: deValue,
            en: "" // Leave English empty for now
        });
        console.log(`Added key: ${key}`);
    } else {
        existing.de = deValue; // Update DE value if changed
    }
}

console.log("Starting migration...");
processDirectory(path.join(CONTENT_DIR, 'works/de'), 'work');
processDirectory(path.join(CONTENT_DIR, 'exhibitions/de'), 'exhibition');
processDirectory(path.join(CONTENT_DIR, 'press/de'), 'press');
processDirectory(path.join(CONTENT_DIR, 'pages'), 'page');

fs.writeFileSync(TABLE_PATH, JSON.stringify(table, null, 2));
console.log("Migration complete. Table saved to src/content/ui/table.json");

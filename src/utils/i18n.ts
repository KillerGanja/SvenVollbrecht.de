import table from '../content/ui/table.json';

export type Locale = 'de' | 'en';

export function t(key: string, lang: string | undefined): string {
    const locale = (lang === 'en' ? 'en' : 'de') as Locale;
    const entry = (table as any).translations.find(item => item.key === key);

    if (!entry) {
        console.warn(`Translation key not found: ${key}`);
        return key;
    }

    return entry[locale] || entry['de'] || key;
}

export function getRelativeLocaleUrl(lang: string, path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${lang}${cleanPath === '/' ? '' : cleanPath}`;
}

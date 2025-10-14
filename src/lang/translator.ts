import { moment } from 'obsidian';
import { en } from './en';
import { zh } from './zh';

// Notice: Using 'any' for now to avoid complex type intersections with functions.
// A more robust solution could involve mapped types to correctly type the arguments.
const translations: any = {
    en,
    zh,
};

let lang: keyof typeof translations = 'en';
const locale = moment.locale();

if (locale.startsWith('zh')) {
    lang = 'zh';
}

// Get all keys from the English translations, assuming it's the base language.
export type TranslationKey = keyof typeof en;

export function t(key: TranslationKey, ...args: any[]): string {
    const translation = translations[lang][key] || translations['en'][key];

    if (typeof translation === 'function') {
        return translation(...args);
    }
    return translation;
}

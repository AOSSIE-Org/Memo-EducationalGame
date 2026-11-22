/** The languages of the app. */

export interface Language {
  /** BCP 47 language code, used for messages, Intl and the `lang` attribute. */
  code: LanguageCode;
  /** The language's name in itself. */
  name: string;
  /** The language's name in English. */
  english: string;
  /** Preferred text-to-speech locale. */
  speech: string;
  dir: 'ltr' | 'rtl';
}

/**
 * First the most spoken languages in the world (Ethnologue 2026, total
 * speakers), then further languages, as long as browsers have a
 * text-to-speech voice for them and the Unicode CLDR has names of countries
 * in them. Arabic dialects use Modern Standard Arabic.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English', english: 'English', speech: 'en-US', dir: 'ltr' },
  { code: 'zh', name: '中文', english: 'Chinese (Mandarin)', speech: 'zh-CN', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi', speech: 'hi-IN', dir: 'ltr' },
  { code: 'es', name: 'Español', english: 'Spanish', speech: 'es-ES', dir: 'ltr' },
  { code: 'ar', name: 'العربية', english: 'Arabic', speech: 'ar-SA', dir: 'rtl' },
  { code: 'fr', name: 'Français', english: 'French', speech: 'fr-FR', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', english: 'Bengali', speech: 'bn-IN', dir: 'ltr' },
  { code: 'pt', name: 'Português', english: 'Portuguese', speech: 'pt-BR', dir: 'ltr' },
  { code: 'id', name: 'Bahasa Indonesia', english: 'Indonesian', speech: 'id-ID', dir: 'ltr' },
  { code: 'ur', name: 'اردو', english: 'Urdu', speech: 'ur-PK', dir: 'rtl' },
  { code: 'ru', name: 'Русский', english: 'Russian', speech: 'ru-RU', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', english: 'German', speech: 'de-DE', dir: 'ltr' },
  { code: 'ja', name: '日本語', english: 'Japanese', speech: 'ja-JP', dir: 'ltr' },
  { code: 'mr', name: 'मराठी', english: 'Marathi', speech: 'mr-IN', dir: 'ltr' },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese', speech: 'vi-VN', dir: 'ltr' },
  { code: 'te', name: 'తెలుగు', english: 'Telugu', speech: 'te-IN', dir: 'ltr' },
  { code: 'sw', name: 'Kiswahili', english: 'Swahili', speech: 'sw-KE', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', english: 'Turkish', speech: 'tr-TR', dir: 'ltr' },
  { code: 'fil', name: 'Filipino', english: 'Filipino', speech: 'fil-PH', dir: 'ltr' },
  { code: 'ta', name: 'தமிழ்', english: 'Tamil', speech: 'ta-IN', dir: 'ltr' },
  { code: 'yue', name: '粵語', english: 'Cantonese', speech: 'zh-HK', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', english: 'Persian', speech: 'fa-IR', dir: 'rtl' },
  { code: 'ko', name: '한국어', english: 'Korean', speech: 'ko-KR', dir: 'ltr' },
  { code: 'am', name: 'አማርኛ', english: 'Amharic', speech: 'am-ET', dir: 'ltr' },
  { code: 'th', name: 'ไทย', english: 'Thai', speech: 'th-TH', dir: 'ltr' },
  { code: 'jv', name: 'Basa Jawa', english: 'Javanese', speech: 'jv-ID', dir: 'ltr' },
  { code: 'it', name: 'Italiano', english: 'Italian', speech: 'it-IT', dir: 'ltr' },
  { code: 'gu', name: 'ગુજરાતી', english: 'Gujarati', speech: 'gu-IN', dir: 'ltr' },
  { code: 'kn', name: 'ಕನ್ನಡ', english: 'Kannada', speech: 'kn-IN', dir: 'ltr' },
  // Further languages with text-to-speech voices (Microsoft Edge's online voices; Android and iOS have many of them).
  { code: 'sq', name: 'Shqip', english: 'Albanian', speech: 'sq-AL', dir: 'ltr' },
  { code: 'eu', name: 'Euskara', english: 'Basque', speech: 'eu-ES', dir: 'ltr' },
  { code: 'bs', name: 'Bosanski', english: 'Bosnian', speech: 'bs-BA', dir: 'ltr' },
  { code: 'bg', name: 'Български', english: 'Bulgarian', speech: 'bg-BG', dir: 'ltr' },
  { code: 'ca', name: 'Català', english: 'Catalan', speech: 'ca-ES', dir: 'ltr' },
  { code: 'hr', name: 'Hrvatski', english: 'Croatian', speech: 'hr-HR', dir: 'ltr' },
  { code: 'cs', name: 'Čeština', english: 'Czech', speech: 'cs-CZ', dir: 'ltr' },
  { code: 'da', name: 'Dansk', english: 'Danish', speech: 'da-DK', dir: 'ltr' },
  { code: 'nl', name: 'Nederlands', english: 'Dutch', speech: 'nl-NL', dir: 'ltr' },
  { code: 'et', name: 'Eesti', english: 'Estonian', speech: 'et-EE', dir: 'ltr' },
  { code: 'fi', name: 'Suomi', english: 'Finnish', speech: 'fi-FI', dir: 'ltr' },
  { code: 'gl', name: 'Galego', english: 'Galician', speech: 'gl-ES', dir: 'ltr' },
  { code: 'el', name: 'Ελληνικά', english: 'Greek', speech: 'el-GR', dir: 'ltr' },
  { code: 'hu', name: 'Magyar', english: 'Hungarian', speech: 'hu-HU', dir: 'ltr' },
  { code: 'is', name: 'Íslenska', english: 'Icelandic', speech: 'is-IS', dir: 'ltr' },
  { code: 'ga', name: 'Gaeilge', english: 'Irish', speech: 'ga-IE', dir: 'ltr' },
  { code: 'lv', name: 'Latviešu', english: 'Latvian', speech: 'lv-LV', dir: 'ltr' },
  { code: 'lt', name: 'Lietuvių', english: 'Lithuanian', speech: 'lt-LT', dir: 'ltr' },
  { code: 'mk', name: 'Македонски', english: 'Macedonian', speech: 'mk-MK', dir: 'ltr' },
  { code: 'mt', name: 'Malti', english: 'Maltese', speech: 'mt-MT', dir: 'ltr' },
  { code: 'nb', name: 'Norsk', english: 'Norwegian', speech: 'nb-NO', dir: 'ltr' },
  { code: 'pl', name: 'Polski', english: 'Polish', speech: 'pl-PL', dir: 'ltr' },
  { code: 'ro', name: 'Română', english: 'Romanian', speech: 'ro-RO', dir: 'ltr' },
  { code: 'sr', name: 'Српски', english: 'Serbian', speech: 'sr-RS', dir: 'ltr' },
  { code: 'sk', name: 'Slovenčina', english: 'Slovak', speech: 'sk-SK', dir: 'ltr' },
  { code: 'sl', name: 'Slovenščina', english: 'Slovenian', speech: 'sl-SI', dir: 'ltr' },
  { code: 'sv', name: 'Svenska', english: 'Swedish', speech: 'sv-SE', dir: 'ltr' },
  { code: 'uk', name: 'Українська', english: 'Ukrainian', speech: 'uk-UA', dir: 'ltr' },
  { code: 'cy', name: 'Cymraeg', english: 'Welsh', speech: 'cy-GB', dir: 'ltr' },
  { code: 'hy', name: 'Հայերեն', english: 'Armenian', speech: 'hy-AM', dir: 'ltr' },
  { code: 'az', name: 'Azərbaycan', english: 'Azerbaijani', speech: 'az-AZ', dir: 'ltr' },
  { code: 'my', name: 'မြန်မာ', english: 'Burmese', speech: 'my-MM', dir: 'ltr' },
  { code: 'ka', name: 'ქართული', english: 'Georgian', speech: 'ka-GE', dir: 'ltr' },
  { code: 'he', name: 'עברית', english: 'Hebrew', speech: 'he-IL', dir: 'rtl' },
  { code: 'kk', name: 'Қазақ тілі', english: 'Kazakh', speech: 'kk-KZ', dir: 'ltr' },
  { code: 'km', name: 'ខ្មែរ', english: 'Khmer', speech: 'km-KH', dir: 'ltr' },
  { code: 'lo', name: 'ລາວ', english: 'Lao', speech: 'lo-LA', dir: 'ltr' },
  { code: 'ms', name: 'Bahasa Melayu', english: 'Malay', speech: 'ms-MY', dir: 'ltr' },
  { code: 'ml', name: 'മലയാളം', english: 'Malayalam', speech: 'ml-IN', dir: 'ltr' },
  { code: 'mn', name: 'Монгол', english: 'Mongolian', speech: 'mn-MN', dir: 'ltr' },
  { code: 'ne', name: 'नेपाली', english: 'Nepali', speech: 'ne-NP', dir: 'ltr' },
  { code: 'ps', name: 'پښتو', english: 'Pashto', speech: 'ps-AF', dir: 'rtl' },
  { code: 'si', name: 'සිංහල', english: 'Sinhala', speech: 'si-LK', dir: 'ltr' },
  { code: 'su', name: 'Basa Sunda', english: 'Sundanese', speech: 'su-ID', dir: 'ltr' },
  { code: 'uz', name: 'Oʻzbekcha', english: 'Uzbek', speech: 'uz-UZ', dir: 'ltr' },
  { code: 'af', name: 'Afrikaans', english: 'Afrikaans', speech: 'af-ZA', dir: 'ltr' },
  { code: 'so', name: 'Soomaali', english: 'Somali', speech: 'so-SO', dir: 'ltr' },
  { code: 'zu', name: 'isiZulu', english: 'Zulu', speech: 'zu-ZA', dir: 'ltr' },
] as const satisfies readonly (Omit<Language, 'code'> & { code: string })[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguage(code: unknown): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code);
}

/**
 * Order of the language picker: English first, then the others in
 * alphabetical order of their own names (Latin script first, then the
 * other scripts, as the Unicode collation orders them).
 */
export function pickerOrder<T extends { code: string; name: string }>(languages: readonly T[]): T[] {
  const collator = new Intl.Collator('en');
  return [...languages].sort((a, b) =>
    a.code === 'en' ? -1 : b.code === 'en' ? 1 : collator.compare(a.name, b.name),
  );
}

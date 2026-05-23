import { defineBoot } from '#q-app/wrappers';
import { createI18n } from 'vue-i18n';

import messages from 'src/i18n';

export type Locale = 'en' | 'es' | 'ca';

export type MessageLanguages = keyof typeof messages;
// Type-define 'en-US' as the master schema for the resource
export type MessageSchema = (typeof messages)['en'];

// See https://vue-i18n.intlify.dev/guide/advanced/typescript.html#global-resource-schema-type-definition
/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module 'vue-i18n' {
  // define the locale messages schema
  export interface DefineLocaleMessage extends MessageSchema {}

  // define the datetime format schema
  export interface DefineDateTimeFormat {}

  // define the number format schema
  export interface DefineNumberFormat {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

const VALID_LOCALES: Locale[] = ['en', 'es', 'ca'];

function getInitialLocale(): Locale {
  const saved = localStorage.getItem('locale');
  if (saved && VALID_LOCALES.includes(saved as Locale)) return saved as Locale;
  const browser = navigator.language.split('-')[0];
  if (VALID_LOCALES.includes(browser as Locale)) return browser as Locale;
  return 'en';
}

export default defineBoot(({ app }) => {
  const i18n = createI18n<{ message: MessageSchema }, MessageLanguages>({
    locale: getInitialLocale(),
    fallbackLocale: 'en',
    legacy: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
  });

  // Set i18n instance on app
  app.use(i18n);
});

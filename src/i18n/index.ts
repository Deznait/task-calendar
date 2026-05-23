import en from './locales/en';
import es from './locales/es';
import ca from './locales/ca';

export type MessageSchema = typeof en;

export default {
  en,
  es,
  ca: ca as MessageSchema, // el fallback a 'en' cubre las keys que falten
};

import { createClient } from '@supabase/supabase-js';
import { boot } from 'quasar/wrappers';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export default boot(() => {
  // el cliente ya está disponible exportándolo directamente
});

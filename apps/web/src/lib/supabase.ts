import { createClient } from '@supabase/supabase-js';
import { assertWebEnv, requireWebEnv } from '../config/env';

assertWebEnv();

export const supabaseClient = createClient(
  requireWebEnv('VITE_SUPABASE_URL'),
  requireWebEnv('VITE_SUPABASE_ANON_KEY'),
);

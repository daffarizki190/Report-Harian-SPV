// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabaseInstance = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * DATABASE SCHEMA RECOMMENDATION:
 * 
 * 1. Table: reports
 *    - id: uuid (primary key)
 *    - created_at: timestamptz (default: now())
 *    - spv_name: text
 *    - date: date
 *    - shift: text (Pagi, Siang, Malam)
 *    - description: text (nullable)
 *    - file_url: text (path in bucket)
 *    - user_id: uuid (references auth.users)
 * 
 * 2. Storage Bucket: daily-reports
 *    - Public access: No (Authenticated users only)
 */

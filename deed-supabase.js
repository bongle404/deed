// ═══════════════════════════════════════════
//  DEED — Supabase Client
//  Import this in every page that needs DB access
// ═══════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://jtpykhrdjkzhcbswrhzo.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cHlraHJkamt6aGNic3dyaHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTYxMjAsImV4cCI6MjA4OTQ5MjEyMH0.U3q_ktH3vN7loxEgUg-oJw9mXYYwhMC0aL6bK9YBVRI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

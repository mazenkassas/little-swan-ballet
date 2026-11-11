/**
 * Pattern for a case-insensitive exact email match with `.ilike('email', ...)`.
 * Supabase Auth stores emails in lowercase, while coach/staff rows may have
 * been saved with capitals, so `.eq('email', ...)` can miss the row.
 * `%`, `_` and `\` are escaped so they match literally.
 */
export function emailPattern(email: string | null | undefined): string {
  return (email ?? '').trim().replace(/[\\%_]/g, '\\$&')
}

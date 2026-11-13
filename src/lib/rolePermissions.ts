// Shared page-access rules for the dashboard. Used by src/proxy.ts (route guard)
// and the dashboard layout (sidebar), so the two can never disagree.
//
// Permissions are edited on the Roles page and stored as JSON in
// system_settings.role_permissions: { [role]: { [page]: { view, create, edit, delete } } }

export type PagePerm = { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean }
export type RolePerms = Record<string, PagePerm>

/**
 * Pages that can be granted on the Roles page, in sidebar order.
 * The key is the first path segment after /dashboard ('dashboard' = the home page).
 */
export const GRANTABLE_PAGES = [
  'dashboard', 'daily', 'students', 'classes', 'subscriptions',
  'payments', 'expenses', 'reports',
  'staff', 'coaches', 'attendance', 'exams', 'events', 'inventory', 'private', 'holidays',
  'settings',
] as const

/** Pages every signed-in staff member may open, whatever their permissions. */
const ALWAYS_ALLOWED = new Set(['no-access'])

export function pageKeyFromPath(pathname: string): string {
  return pathname.split('/')[2] || 'dashboard'
}

/** Parses system_settings.role_permissions and returns the entry for `role`. */
export function parseRolePerms(value: string | null | undefined, role: string): RolePerms {
  try {
    const all = JSON.parse(value || '{}')
    const perms = all?.[role]
    return perms && typeof perms === 'object' ? perms : {}
  } catch {
    return {}
  }
}

/**
 * Whether `role` may open `page`. super_admin sees everything; every other role
 * sees only pages with "View" switched on. Pages that are not on the Roles page
 * (roles, logs, sessions, transfers, …) are super_admin only.
 */
export function canViewPage(role: string, perms: RolePerms, page: string): boolean {
  if (role === 'super_admin') return true
  if (ALWAYS_ALLOWED.has(page)) return true
  return !!perms?.[page]?.view
}

/** The path a user lands on when they are sent away from a page they cannot view. */
export function homePathFor(role: string, perms: RolePerms): string {
  const first = GRANTABLE_PAGES.find(p => canViewPage(role, perms, p))
  if (!first) return '/dashboard/no-access'
  return first === 'dashboard' ? '/dashboard' : `/dashboard/${first}`
}

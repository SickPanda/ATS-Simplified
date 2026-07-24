/**
 * Desk ownership helpers — display names match server CurrentUserDisplayName.
 */

export function isMine(ownerField, user) {
  if (!user) return true;
  const me = (user.name || '').trim();
  if (!me) return true;
  const owner = (ownerField || '').trim();
  // Unassigned counts as available on "my desk"
  if (!owner) return true;
  return owner.toLowerCase() === me.toLowerCase();
}

export function filterByDesk(items, ownerKey, deskMode, user) {
  if (deskMode !== 'mine' || !Array.isArray(items)) return items;
  return items.filter(item => isMine(item[ownerKey], user));
}

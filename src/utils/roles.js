// utils/roles.js
// Normalizes role names so "Super Admin", "super_admin" and "superadmin" all match.

export const roleKey = (role) =>
  String(role ?? "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

// Can view and edit every employee.
export const FULL_ACCESS = ["superadmin", "admin", "hr"];

// Can view and edit only their own department (never their own record).
export const LEADER_ROLES = ["leader", "teamleader"];

export const MANAGE_ROLES = [...FULL_ACCESS, ...LEADER_ROLES];

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}

export function getStoredAuth(): { token: string | null; user: AuthUser | null; role: string | null } {
  if (typeof window === "undefined") return { token: null, user: null, role: null };
  const token = localStorage.getItem("ic_token");
  const userRaw = localStorage.getItem("ic_user");
  const role = localStorage.getItem("ic_role");
  try {
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user, role };
  } catch {
    return { token: null, user: null, role: null };
  }
}

export function setStoredAuth(token: string, user: AuthUser, role: string) {
  localStorage.setItem("ic_token", token);
  localStorage.setItem("ic_user", JSON.stringify(user));
  localStorage.setItem("ic_role", role);
}

export function clearStoredAuth() {
  localStorage.removeItem("ic_token");
  localStorage.removeItem("ic_user");
  localStorage.removeItem("ic_role");
}

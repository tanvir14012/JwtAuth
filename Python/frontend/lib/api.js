const API_ROOT = process.env.NEXT_PUBLIC_API_ROOT || "http://localhost:8000/api";

export const authStore = {
  getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("accessToken") || "";
  },
  setToken(token) {
    if (typeof window === "undefined") return;
    localStorage.setItem("accessToken", token);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.clear();
  }
};

export const decodeJwtPayload = (token) => {
  const payload = token.split(".")[1];
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decoded);
};

const withAuthHeaders = (extraHeaders = {}) => {
  const token = authStore.getToken();
  const headers = { ...extraHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    credentials: "include",
    headers: withAuthHeaders(options.headers || {})
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok && response.status !== 401 && response.status !== 423) {
    throw new Error(typeof body === "string" ? body : body?.error || "Request failed");
  }

  if (response.status === 401) {
    const refreshed = await refreshUserTokens();
    if (refreshed?.refreshSucceeded) {
      return apiRequest(path, options);
    }
  }

  return { status: response.status, body };
};

export const refreshUserTokens = async () => {
  const response = await fetch(`${API_ROOT}/account/refreshUserTokens`, {
    method: "POST",
    credentials: "include"
  });
  const body = await response.json();
  if (body.refreshSucceeded && body.accessToken) {
    authStore.setToken(body.accessToken);
  } else if (body.signedOut) {
    authStore.clear();
  }
  return body;
};

export const getAuthStatus = () => {
  const token = authStore.getToken();
  if (!token) return null;
  try {
    const payload = decodeJwtPayload(token);
    return {
      userId: payload.nameid,
      userEmail: payload.email,
      userType: payload.usertype,
      isSessionLocked: payload.isSessionLocked === "true"
    };
  } catch {
    authStore.clear();
    return null;
  }
};

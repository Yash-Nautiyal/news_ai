import axios, { type AxiosError } from "axios";

// When unset, use same origin so Next.js API routes (e.g. /api/articles/...) are hit without CORS.
const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const api = axios.create({
  baseURL: baseURL || undefined,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT from NextAuth session (client-side only)
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Token will be set by auth provider / session; middleware or layout can call setAuthToken(session?.accessToken)
    const token = (window as unknown as { __NEXT_AUTH_TOKEN?: string }).__NEXT_AUTH_TOKEN;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
      return Promise.reject(new Error("Unauthorized"));
    }
    if (error.code === "ERR_NETWORK") {
      return Promise.reject(new Error("Could not connect to server. Please try again."));
    }
    const message =
      (error.response?.data as { detail?: string })?.detail ??
      error.message ??
      "Something went wrong";
    return Promise.reject(new Error(typeof message === "string" ? message : JSON.stringify(message)));
  }
);

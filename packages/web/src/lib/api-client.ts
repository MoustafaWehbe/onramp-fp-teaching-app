import axios, { type AxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Refresh the access token cookie on 401, then retry the original request
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token is sent automatically via HttpOnly cookie
        await axios.post("/api/auth/refresh", null, { withCredentials: true });
        return apiClient(originalRequest);
      } catch {
        // Let the caller decide what to do (e.g. AuthProvider sets user=null,
        // protected routes redirect to /login). Never redirect here — that would
        // cause an infinite remount loop.
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

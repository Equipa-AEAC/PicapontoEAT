import axios from "axios";

import type { ApiErrorResponse } from "../types/api";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getApiErrorMessage(error: unknown, fallbackMessage = "Unable to complete the request.") {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallbackMessage;
  }

  return error.response?.data.message ?? error.message ?? fallbackMessage;
}
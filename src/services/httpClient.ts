import axios from "axios";
import { t } from "../i18n";

import type { ApiErrorResponse } from "../types/api";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export function getApiErrorMessage(error: unknown, fallbackMessage = t("errors.requestFailed")) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallbackMessage;
  }

  return error.response?.data.message ?? error.message ?? fallbackMessage;
}
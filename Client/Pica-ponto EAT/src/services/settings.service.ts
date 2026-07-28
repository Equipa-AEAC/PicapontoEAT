import type { ApplicationSettings } from "../types/settings";

import { cloneRecord, mockRequest } from "./mockTransport";
import { mockDatabase } from "./mockDatabase";

export async function getSettings(): Promise<ApplicationSettings> {
  return mockRequest(() => cloneRecord(mockDatabase.settings));
}

export async function saveSettings(values: ApplicationSettings): Promise<ApplicationSettings> {
  return mockRequest(() => {
    mockDatabase.settings = cloneRecord(values);
    return cloneRecord(mockDatabase.settings);
  });
}

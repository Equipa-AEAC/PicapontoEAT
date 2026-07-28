export async function mockRequest<T>(factory: () => T, delayMs = 180): Promise<T> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

  return factory();
}

export function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

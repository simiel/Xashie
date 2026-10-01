function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export const sessionCredentialStore = {
  async getItem(key: string): Promise<string | null> {
    return storage()?.getItem(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const currentStorage = storage();
    if (!currentStorage) throw new Error('Private browser storage is unavailable.');
    currentStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    storage()?.removeItem(key);
  },
};

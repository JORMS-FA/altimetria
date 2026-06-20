const STORAGE_KEY = "altimetria_downloads_count";
const FREE_LIMIT = 5;

export function getDownloadCount() {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

export function incrementDownloads() {
  const current = getDownloadCount();
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY, String(next));
  return next;
}

export function getRemainingFree() {
  return Math.max(0, FREE_LIMIT - getDownloadCount());
}

export function hasReachedLimit() {
  return getDownloadCount() >= FREE_LIMIT;
}

export const FREE_DOWNLOAD_LIMIT = FREE_LIMIT;

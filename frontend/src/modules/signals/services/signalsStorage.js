// Re-export the shared storage utilities and class
export {
  isStorageUpdating,
  shouldFetchNewResults,
  getResultsFromStorage,
  setResultsInStorage,
  default as SignalsStorage,
} from '@/shared/signals/services/SignalsStorage';
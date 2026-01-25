type TransactionsChangedListener = () => void;

const listeners = new Set<TransactionsChangedListener>();

export const subscribeTransactionsChanged = (
  listener: TransactionsChangedListener,
) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const notifyTransactionsChanged = () => {
  listeners.forEach((listener) => listener());
};

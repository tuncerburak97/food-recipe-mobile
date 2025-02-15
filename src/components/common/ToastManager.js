import React, { useState, useCallback, createContext, useContext } from "react";
import CustomToast from "./CustomToast";

const ToastContext = createContext(null);

/**
 * Toast manager component that handles showing and hiding toasts
 */
export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback(
    ({ message, type = "success", duration = 3000 }) => {
      setToast({ message, type, duration });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <CustomToast {...toast} onHide={hideToast} />}
    </ToastContext.Provider>
  );
};

/**
 * Hook to use toast functionality in components
 * @returns {Function} showToast function
 * @example
 * const showToast = useToast();
 * showToast({ message: 'İşlem başarılı!', type: 'success' });
 */
export const useToast = () => {
  const showToast = useContext(ToastContext);

  if (!showToast) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return showToast;
};

/**
 * Toast Notification Component
 * Displays temporary notifications for auto-calculated values
 */

import { useEffect } from "react";
import { XMarkIcon, InformationCircleIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export type ToastType = "info" | "success" | "warning";

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return "border-green-500/50";
      case "warning":
        return "border-amber-500/50";
      default:
        return "border-blue-500/50";
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 border-2 ${getBorderColor()} shadow-2xl max-w-md animate-slide-up`}
      role="alert"
    >
      {getIcon()}
      <p className="text-sm text-white flex-1">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-slate-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Toast Container Component
 * Manages multiple toast notifications
 */
interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

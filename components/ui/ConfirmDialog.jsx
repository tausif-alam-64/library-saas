// components/ui/ConfirmDialog.jsx
"use client";

import { useCallback, useEffect } from "react";
import useUIStore from "@/stores/useUIStore";

export function ConfirmDialog() {
  const confirm = useUIStore((state) => state.confirm);
  const hideConfirm = useUIStore((state) => state.hideConfirm);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        if (confirm.onCancel) confirm.onCancel();
        hideConfirm();
      }
    },
    [confirm, hideConfirm]
  );
  // Close on Escape key
  useEffect(() => {
    if (!confirm) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirm, handleKeyDown]);

  if (!confirm) return null;

  function handleConfirm() {
    confirm.onConfirm();
    hideConfirm();
  }

  function handleCancel() {
    if (confirm.onCancel) confirm.onCancel();
    hideConfirm();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0, 0, 0, 0.4)",
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={
          confirm.description ? "confirm-description" : undefined
        }
        style={{
          position: "fixed",
          // Center on screen
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "calc(100% - 2rem)",
          maxWidth: "360px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "1.5rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          animation: "dialogIn 0.15s ease",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: confirm.danger ? "#fef2f2" : "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          {confirm.danger ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#6b7280" strokeWidth="2" />
              <path
                d="M12 8v4m0 4h.01"
                stroke="#6b7280"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <h2
          id="confirm-title"
          style={{
            fontSize: "1rem",
            fontWeight: "600",
            color: "#111111",
            margin: "0 0 0.375rem 0",
          }}
        >
          {confirm.message}
        </h2>

        {/* Description */}
        {confirm.description && (
          <p
            id="confirm-description"
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              margin: "0 0 1.5rem 0",
              lineHeight: "1.5",
            }}
          >
            {confirm.description}
          </p>
        )}

        {!confirm.description && <div style={{ marginBottom: "1.5rem" }} />}

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
          }}
        >
          {/* Cancel */}
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              height: "48px",
              background: "#f3f4f6",
              color: "#374151",
              border: "none",
              borderRadius: "10px",
              fontSize: "0.9375rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              height: "48px",
              background: confirm.danger ? "#dc2626" : "#111111",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontSize: "0.9375rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialogIn {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
}

// app/(app)/members/[id]/pay/_components/PaymentForm.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES, PAYMENT_MODES } from "@/utils/constants";
import { formatCurrency, formatDate, toDbDate } from "@/utils/formatters";
import useUIStore from "@/stores/useUIStore";

// paymentContext — pre-computed on the server
// {
//   memberId, memberName,
//   defaultAmount, defaultPeriodStart, defaultPeriodEnd,
//   partners: [{ id, name }],
//   currentPartnerId,
//   isProrated, daysRemaining
// }

export function PaymentForm({ paymentContext }) {
  const router = useRouter();
  const addToast = useUIStore((state) => state.addToast);

  const [amount, setAmount] = useState(
    String(paymentContext.defaultAmount || ""),
  );
  const [periodStart, setPeriodStart] = useState(
    paymentContext.defaultPeriodStart || "",
  );
  const [periodEnd, setPeriodEnd] = useState(
    paymentContext.defaultPeriodEnd || "",
  );
  const [paidOn, setPaidOn] = useState(toDbDate(new Date()));
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES.CASH);
  const [collectedBy, setCollectedBy] = useState(
    paymentContext.currentPartnerId || "",
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function validate() {
    const errs = {};

    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      errs.amount = "Enter a valid amount";
    }

    if (!periodStart) errs.periodStart = "Period start date is required";
    if (!periodEnd) errs.periodEnd = "Period end date is required";
    if (periodStart && periodEnd && periodStart > periodEnd) {
      errs.periodStart = "Start date must be before end date";
    }

    if (!paidOn) errs.paidOn = "Payment date is required";
    if (!collectedBy) errs.collectedBy = "Select who collected this payment";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/members/${paymentContext.memberId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_paid: parseFloat(amount),
          period_start_date: periodStart,
          period_end_date: periodEnd,
          paid_on: paidOn,
          payment_mode: paymentMode,
          collected_by_partner_id: collectedBy,
          is_prorated: paymentContext.isProrated || false,
          days_covered: paymentContext.daysRemaining || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to record payment");
      }

      addToast(
        `${formatCurrency(parseFloat(amount))} recorded for ${paymentContext.memberName}`,
        "success",
      );

      // Go back to member profile — server component will show updated fee status
      router.push(ROUTES.MEMBER_PROFILE(paymentContext.memberId));
      router.refresh();
    } catch (err) {
      console.error("[PaymentForm] submit error:", err);
      addToast(err.message || "Failed to record payment", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = `
    w-full h-11 px-3.5 bg-surface border rounded-xl
    text-sm text-primary outline-none
    focus:border-gray-400 focus:ring-1 focus:ring-gray-100
    transition-colors
  `;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="px-4 pt-5 pb-36 space-y-5">
        {/* Member info banner */}
        <div className="bg-gray-50 rounded-2xl px-4 py-3">
          <p className="text-xs text-muted">Recording payment for</p>
          <p className="text-sm font-bold text-primary mt-0.5">
            {paymentContext.memberName}
          </p>
        </div>

        {/* Amount */}
        <div>
          <label
            className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5"
          >
            Amount received <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2
                             text-sm font-bold text-muted pointer-events-none"
            >
              ₹
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputClass} pl-8
                ${errors.amount ? "border-danger" : "border-gray-200"}`}
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-danger mt-1">{errors.amount}</p>
          )}
        </div>

        {/* Payment mode — two big buttons */}
        <div>
          <label
            className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5"
          >
            Payment mode <span className="text-danger">*</span>
          </label>
          <div className="flex gap-3">
            {[
              {
                mode: PAYMENT_MODES.CASH,
                label: "Cash",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="2"
                      y="6"
                      width="20"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M6 12h.01M18 12h.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
              {
                mode: PAYMENT_MODES.UPI,
                label: "UPI",
                icon: (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L2 7l10 5 10-5-10-5z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17l10 5 10-5M2 12l10 5 10-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
            ].map(({ mode, label, icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-1.5
                  h-16 rounded-2xl border-2 font-semibold text-sm
                  transition-all touch-manipulation
                  ${
                    paymentMode === mode
                      ? "border-primary bg-primary text-white"
                      : "border-gray-200 bg-surface text-gray-600 active:bg-gray-50"
                  }
                `}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment period */}
        <div className="space-y-3">
          <label
            className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide"
          >
            Period covered <span className="text-danger">*</span>
          </label>
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-muted mb-1">From</p>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className={`${inputClass}
                  ${errors.periodStart ? "border-danger" : "border-gray-200"}`}
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted mb-1">To</p>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className={`${inputClass}
                  ${errors.periodEnd ? "border-danger" : "border-gray-200"}`}
              />
            </div>
          </div>
          {(errors.periodStart || errors.periodEnd) && (
            <p className="text-xs text-danger">
              {errors.periodStart || errors.periodEnd}
            </p>
          )}
        </div>

        {/* Date paid */}
        <div>
          <label
            className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5"
          >
            Date paid <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={paidOn}
            max={toDbDate(new Date())}
            onChange={(e) => setPaidOn(e.target.value)}
            className={`${inputClass}
              ${errors.paidOn ? "border-danger" : "border-gray-200"}`}
          />
          {errors.paidOn && (
            <p className="text-xs text-danger mt-1">{errors.paidOn}</p>
          )}
        </div>

        {/* Collected by — critical for 3-partner trust problem */}
        <div>
          <label
            className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5"
          >
            Collected by <span className="text-danger">*</span>
          </label>
          <div className="flex flex-col gap-2">
            {paymentContext.partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setCollectedBy(p.id)}
                className={`
                  h-12 px-4 rounded-xl border-2 text-sm font-medium text-left
                  flex items-center gap-3 transition-all touch-manipulation
                  ${
                    collectedBy === p.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-gray-200 bg-surface text-gray-700 active:bg-gray-50"
                  }
                `}
              >
                {/* Selection indicator */}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center
                                 justify-center shrink-0 transition-colors
                  ${
                    collectedBy === p.id
                      ? "border-primary bg-primary"
                      : "border-gray-300"
                  }`}
                >
                  {collectedBy === p.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                {p.name}
                {p.id === paymentContext.currentPartnerId && (
                  <span className="text-[10px] text-muted ml-auto">You</span>
                )}
              </button>
            ))}
          </div>
          {errors.collectedBy && (
            <p className="text-xs text-danger mt-1">{errors.collectedBy}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            className="block text-xs font-semibold text-gray-500
                            uppercase tracking-wide mb-1.5"
          >
            Notes (optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Paid partial, balance next week"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface border border-gray-200
                       rounded-xl text-sm text-primary outline-none resize-none
                       focus:border-gray-400 transition-colors"
          />
        </div>
      </div>

      {/* Fixed bottom submit bar */}
      {mounted && (
        <div
          className="fixed left-0 right-0 z-30 bg-surface border-t border-gray-100 px-4 py-3"
          style={{
            bottom: 0,
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom) + 64px)",
          }}
        >
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-white rounded-xl
                 text-sm font-semibold disabled:bg-gray-300
                 active:opacity-90 touch-manipulation
                 flex items-center justify-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="3"
                  />
                  <path
                    d="M12 2a10 10 0 0110 10"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Recording...
              </>
            ) : (
              `Record ${amount ? formatCurrency(parseFloat(amount) || 0) : "payment"}`
            )}
          </button>
        </div>
      )}
    </form>
  );
}

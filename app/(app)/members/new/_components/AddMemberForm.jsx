// app/(app)/members/new/_components/AddMemberForm.jsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SeatPickerStep } from "./SeatPickerStep";
import { ROUTES } from "@/utils/constants";
import { calculateProratedFee, isFirstOfMonth } from "@/lib/calculations";
import {
  formatCurrency,
  formatDate,
  formatShift,
  toDbDate,
} from "@/utils/formatters";
import useUIStore from "@/stores/useUIStore";

// Steps
const STEP_DETAILS = 1;
const STEP_SEAT = 2;
const STEP_CONFIRM = 3;

const TOTAL_STEPS = 3;

// Step indicator at the top
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-surface">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div
              className={`
              w-6 h-6 rounded-full flex items-center justify-center
              text-xs font-bold shrink-0 transition-colors
              ${
                isDone
                  ? "bg-success text-white"
                  : isActive
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-muted"
              }
            `}
            >
              {isDone ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                step
              )}
            </div>
            {step < total && (
              <div
                className={`flex-1 h-0.5 rounded-full transition-colors
                ${isDone ? "bg-success" : "bg-gray-100"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Reusable form field
function Field({ label, required, children, error }) {
  return (
    <div>
      <label
        className="block text-xs font-semibold text-gray-500 uppercase
                        tracking-wide mb-1.5"
      >
        {label} {required && <span className="text-danger normal-case">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

// Reusable input style
const inputClass = `
  w-full h-11 px-3.5 bg-surface border border-gray-200 rounded-xl
  text-sm text-primary outline-none
  focus:border-gray-400 focus:ring-1 focus:ring-gray-100
  disabled:bg-gray-50 disabled:text-muted
  transition-colors
`;

export function AddMemberForm({ fees, initialSeats = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToast = useUIStore((state) => state.addToast);

  // Pre-fill seat from URL params if coming from seat map "Assign" button
  const urlSeatId = searchParams.get("seat_id");
  const urlShift = searchParams.get("shift");
  const urlSeatNumber = searchParams.get("seat_number");

  const [step, setStep] = useState(
    // If seat is pre-selected from URL, start at step 1 but skip to 2 after details
    STEP_DETAILS,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Step 1 — personal details
  const [details, setDetails] = useState({
    name: "",
    phone: "",
    address: "",
    aadhar_last4: "",
    notes: "",
  });
  const [detailErrors, setDetailErrors] = useState({});

  // Step 2 — seat selection
  const [seatSelection, setSeatSelection] = useState(
    urlSeatId && urlShift && urlSeatNumber
      ? { seat_id: urlSeatId, seat_number: urlSeatNumber, shift: urlShift }
      : null,
  );

  // Step 3 — join date for proration
  const [joinDate, setJoinDate] = useState(toDbDate(new Date()));

  // Computed prorated amount based on join date and selected shift
  function computeFirstPayment() {
    if (!seatSelection) return null;

    const shiftFee = {
      morning: Number(fees?.morning_fee ?? 500),
      evening: Number(fees?.evening_fee ?? 500),
      fulltime: Number(fees?.fulltime_fee ?? 900),
    }[seatSelection.shift];

    if (isFirstOfMonth(joinDate)) {
      return {
        amount: shiftFee,
        isProrated: false,
        daysInMonth: null,
        daysRemaining: null,
        periodStart: joinDate,
        periodEnd: (() => {
          const d = new Date(joinDate);
          return toDbDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
        })(),
      };
    }

    return {
      ...calculateProratedFee(joinDate, shiftFee),
      isProrated: true,
    };
  }

  // ── Step 1 validation ────────────────────────────────────────────────────

  function validateDetails() {
    const errors = {};

    if (!details.name.trim() || details.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    const phoneDigits = details.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      errors.phone = "Phone must be exactly 10 digits";
    }

    if (details.aadhar_last4 && !/^\d{4}$/.test(details.aadhar_last4)) {
      errors.aadhar_last4 = "Must be exactly the last 4 digits";
    }

    setDetailErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNextFromDetails() {
    if (!validateDetails()) return;

    // If seat pre-selected from URL, confirm it and skip to step 3
    if (urlSeatId && urlShift && urlSeatNumber && !seatSelection) {
      setSeatSelection({
        seat_id: urlSeatId,
        seat_number: urlSeatNumber,
        shift: urlShift,
      });
    }

    setStep(STEP_SEAT);
  }

  // ── Step 2 ───────────────────────────────────────────────────────────────

  const handleSeatSelect = useCallback((selection) => {
    setSeatSelection(selection);
    setStep(STEP_CONFIRM);
  }, []);

  // ── Step 3 — final submit ────────────────────────────────────────────────

  async function handleSubmit() {
    if (isSubmitting || !seatSelection) return;

    setIsSubmitting(true);

    const firstPayment = computeFirstPayment();

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: details.name.trim(),
          phone: details.phone.replace(/\D/g, ""),
          address: details.address.trim() || null,
          aadhar_last4: details.aadhar_last4 || null,
          notes: details.notes.trim() || null,
          seat_id: seatSelection.seat_id,
          shift: seatSelection.shift,
          join_date: joinDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "SEAT_CONFLICT") {
          addToast("That seat and shift is already occupied", "error");
          setStep(STEP_SEAT);
          setSeatSelection(null);
          return;
        }
        if (data.error === "DUPLICATE_PHONE") {
          addToast("A member with this phone number already exists", "error");
          setStep(STEP_DETAILS);
          setDetailErrors({ phone: "This phone number is already registered" });
          return;
        }
        throw new Error(data.message || "Failed to add member");
      }

      addToast(`${details.name.trim()} added successfully`, "success");

      // Navigate to new member's profile
      router.push(ROUTES.MEMBER_PROFILE(data.member.id));
      router.refresh();
    } catch (err) {
      console.error("[AddMemberForm] submit error:", err);
      addToast(
        err.message || "Failed to add member. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const firstPayment = step === STEP_CONFIRM ? computeFirstPayment() : null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Step indicator */}
      <StepIndicator current={step} total={TOTAL_STEPS} />

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Step 1: Personal Details ─────────────────────────────────── */}
        {step === STEP_DETAILS && (
          <div className="px-4 pt-5 pb-32 space-y-4">
            <div>
              <h2 className="text-base font-bold text-primary mb-0.5">
                Personal details
              </h2>
              <p className="text-xs text-muted">
                Enter the student's information from their ID proof
              </p>
            </div>

            {/* Name */}
            <Field label="Full name" required error={detailErrors.name}>
              <input
                type="text"
                autoFocus
                autoComplete="name"
                placeholder="Rahul Kumar"
                value={details.name}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, name: e.target.value }))
                }
                className={inputClass}
              />
            </Field>

            {/* Phone */}
            <Field label="Phone number" required error={detailErrors.phone}>
              <div className="flex gap-2">
                <div
                  className="h-11 px-3 bg-gray-100 border border-gray-200
                               rounded-xl flex items-center text-sm font-medium
                               text-muted shrink-0"
                >
                  +91
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={details.phone}
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setDetails((d) => ({ ...d, phone: digits }));
                  }}
                  className={inputClass}
                />
              </div>
              <p className="text-[10px] text-muted mt-1">
                Used for search and notifications
              </p>
            </Field>

            {/* Address */}
            <Field label="Address" error={detailErrors.address}>
              <input
                type="text"
                placeholder="Gandhi Nagar, Kushinagar"
                value={details.address}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, address: e.target.value }))
                }
                className={inputClass}
              />
            </Field>

            {/* Aadhar last 4 */}
            <Field
              label="Aadhar (last 4 digits only)"
              error={detailErrors.aadhar_last4}
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder="4521"
                maxLength={4}
                value={details.aadhar_last4}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setDetails((d) => ({ ...d, aadhar_last4: digits }));
                }}
                className={inputClass}
              />
              <p className="text-[10px] text-muted mt-1">
                Never store the full Aadhar number — last 4 digits only
              </p>
            </Field>

            {/* Notes */}
            <Field label="Notes (optional)">
              <textarea
                rows={2}
                placeholder="Any notes about this member..."
                value={details.notes}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, notes: e.target.value }))
                }
                className={`${inputClass} h-auto py-2.5 resize-none`}
              />
            </Field>
          </div>
        )}

        {/* ── Step 2: Seat Selection ───────────────────────────────────── */}
        {step === STEP_SEAT && (
          <div className="px-4 pt-5 pb-32">
            <div className="mb-5">
              <h2 className="text-base font-bold text-primary mb-0.5">
                Select a seat
              </h2>
              <p className="text-xs text-muted">
                Tap any available seat, then choose morning, evening, or full
                time
              </p>
            </div>

            <SeatPickerStep
              initialSeats={initialSeats}
              preselectedSeatId={urlSeatId}
              preselectedShift={urlShift}
              selectedSeatId={seatSelection?.seat_id}
              selectedShift={seatSelection?.shift}
              onSelect={handleSeatSelect}
            />
          </div>
        )}

        {/* ── Step 3: Review + Join Date ───────────────────────────────── */}
        {step === STEP_CONFIRM && seatSelection && (
          <div className="px-4 pt-5 pb-32 space-y-5">
            <div>
              <h2 className="text-base font-bold text-primary mb-0.5">
                Review and confirm
              </h2>
              <p className="text-xs text-muted">
                Verify details and set the join date
              </p>
            </div>

            {/* Summary card */}
            <div
              className="bg-surface rounded-2xl border border-gray-100 divide-y
                            divide-gray-50 overflow-hidden"
            >
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted font-medium">Name</span>
                <span className="text-sm font-semibold text-primary">
                  {details.name.trim()}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted font-medium">Phone</span>
                <span className="text-sm font-semibold text-primary">
                  +91 {details.phone}
                </span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-muted font-medium">Seat</span>
                <span className="text-sm font-semibold text-primary">
                  {seatSelection.seat_number} ·{" "}
                  {formatShift(seatSelection.shift)}
                </span>
              </div>
              <button
                onClick={() => setStep(STEP_SEAT)}
                className="w-full px-4 py-2.5 flex items-center justify-between
                           active:bg-gray-50 touch-manipulation"
              >
                <span className="text-xs text-info">Change seat</span>
                <svg
                  className="w-3.5 h-3.5 text-info"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Join date — affects proration */}
            <Field label="Join date" required>
              <input
                type="date"
                value={joinDate}
                max={toDbDate(new Date())}
                onChange={(e) => setJoinDate(e.target.value)}
                className={inputClass}
              />
              <p className="text-[10px] text-muted mt-1">
                Can be set to yesterday or earlier if they joined recently
              </p>
            </Field>

            {/* Fee calculation preview */}
            {firstPayment && (
              <div
                className={`rounded-2xl p-4 space-y-3
                ${firstPayment.isProrated ? "bg-amber-50" : "bg-green-50"}`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide
                  ${firstPayment.isProrated ? "text-amber-700" : "text-green-700"}`}
                >
                  {firstPayment.isProrated
                    ? "Prorated first payment"
                    : "Full month payment"}
                </p>

                <div className="space-y-1.5">
                  {firstPayment.isProrated && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-800">Joining on</span>
                        <span className="font-medium text-amber-900">
                          {formatDate(joinDate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-800">
                          Days remaining in month
                        </span>
                        <span className="font-medium text-amber-900">
                          {firstPayment.daysRemaining} of{" "}
                          {firstPayment.daysInMonth}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-800">Period covered</span>
                        <span className="font-medium text-amber-900">
                          {formatDate(firstPayment.periodStart)} —{" "}
                          {formatDate(firstPayment.periodEnd)}
                        </span>
                      </div>
                    </>
                  )}

                  {!firstPayment.isProrated && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-800">Period</span>
                      <span className="font-medium text-green-900">
                        {formatDate(firstPayment.periodStart)} —{" "}
                        {formatDate(firstPayment.periodEnd)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex justify-between text-base font-bold pt-1
                                   border-t border-opacity-30
                    ${
                      firstPayment.isProrated
                        ? "border-amber-300 text-amber-900"
                        : "border-green-300 text-green-900"
                    }`}
                  >
                    <span>First payment</span>
                    <span>{formatCurrency(firstPayment.amount)}</span>
                  </div>
                </div>

                <p
                  className={`text-[10px] leading-snug
                  ${firstPayment.isProrated ? "text-amber-700" : "text-green-700"}`}
                >
                  {firstPayment.isProrated
                    ? `From next month, regular fee will be ${formatCurrency(
                        {
                          morning: fees?.morning_fee,
                          evening: fees?.evening_fee,
                          fulltime: fees?.fulltime_fee,
                        }[seatSelection.shift],
                      )}/month on the 1st.`
                    : "Joining on the 1st — no proration needed."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom bar — only rendered client-side.
          env(safe-area-inset-bottom) is browser-only — rendering it on the server
          causes a guaranteed hydration mismatch. The mounted gate prevents this. */}
      {mounted && (
        <div
          className="fixed left-0 right-0 z-30 bg-surface border-t border-gray-100 px-4 py-3 space-y-2"
          style={{
            bottom: 0,
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom) + 64px)",
          }}
        >
          {step === STEP_DETAILS && (
            <button
              onClick={handleNextFromDetails}
              className="w-full h-12 bg-primary text-white rounded-xl
                   text-sm font-semibold active:opacity-90
                   touch-manipulation transition-opacity"
            >
              Next — Select seat
            </button>
          )}

          {step === STEP_SEAT && (
            <button
              onClick={() => setStep(STEP_DETAILS)}
              className="w-full h-12 bg-gray-100 text-gray-700 rounded-xl
                   text-sm font-semibold active:bg-gray-200
                   touch-manipulation"
            >
              Back
            </button>
          )}

          {step === STEP_CONFIRM && (
            <div className="space-y-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-12 bg-primary text-white rounded-xl
                     text-sm font-semibold disabled:bg-gray-300
                     active:opacity-90 touch-manipulation
                     flex items-center justify-center gap-2
                     transition-all"
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
                    Adding member...
                  </>
                ) : (
                  `Confirm — Add ${details.name.trim() || "member"}`
                )}
              </button>
              <button
                onClick={() => setStep(STEP_SEAT)}
                disabled={isSubmitting}
                className="w-full h-10 text-sm text-muted
                     touch-manipulation active:text-primary"
              >
                Back to seat selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// app/(app)/members/[id]/_components/FeeSection.jsx

import Link from "next/link";
import { FeeStatusBadge } from "@/components/ui/FeeStatusBadge";
import { RoleGuard } from "@/components/ui/RoleGuard";
import { FEE_STATUS, ROUTES } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/formatters";

// feeInfo — pre-computed on the server by the page component
// {
//   status: 'paid' | 'grace' | 'overdue',
//   daysOverdue: number,
//   daysLeft: number,
//   currentPeriodStart: string,
//   currentPeriodEnd: string,
//   amountDue: number,
//   lastPayment: { paid_on, amount_paid, period_end_date } | null,
//   memberStatus: 'active' | 'inactive',
// }

export function FeeSection({ memberId, feeInfo }) {
  const {
    status,
    daysOverdue,
    daysLeft,
    currentPeriodStart,
    currentPeriodEnd,
    amountDue,
    lastPayment,
    memberStatus,
  } = feeInfo

  // Inactive members do not have fee tracking
  if (memberStatus === "inactive") {
    return (
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <p className="text-xs text-muted">Member is inactive — no fee tracking</p>
      </div>
    );
  }

  return (
    <div className="bg-white px-4 py-4 border-b border-gray-100">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Fee status
        </h2>
        <FeeStatusBadge
          status={status}
          daysOverdue={daysOverdue}
          daysLeft={daysLeft}
        />
      </div>

      {/* ── PAID STATE ──────────────────────────────────────────────── */}
      {status === FEE_STATUS.PAID && lastPayment && (
        <div className="space-y-3">
          {/* What they HAVE paid for — clear label */}
          <div className="bg-green-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold text-green-700 uppercase
                           tracking-wide mb-1">
              Current paid period
            </p>
            <p className="text-sm font-semibold text-green-900">
              {formatDate(lastPayment.period_start_date)} — {formatDate(lastPayment.period_end_date)}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {formatCurrency(lastPayment.amount_paid)} · {formatDate(lastPayment.paid_on)} · {lastPayment.payment_mode?.toUpperCase()}
            </p>
          </div>

          {/* What to collect NEXT — clear label */}
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold text-muted uppercase
                           tracking-wide mb-1">
              Next payment due
            </p>
            <p className="text-sm font-medium text-primary">
              {formatDate(currentPeriodStart)} — {formatDate(currentPeriodEnd)}
            </p>
            {amountDue && (
              <p className="text-xs text-muted mt-0.5">
                {formatCurrency(amountDue)} expected
              </p>
            )}
          </div>

          <RoleGuard>
            <Link
              href={ROUTES.MEMBER_PAY(memberId)}
              className="flex items-center justify-center h-10 rounded-xl
                         border border-gray-200 text-sm font-medium text-gray-700
                         active:bg-gray-50 touch-manipulation no-underline"
            >
              Record next payment
            </Link>
          </RoleGuard>
        </div>
      )}

        {/* ── GRACE STATE ─────────────────────────────────────────────── */}
      {status === FEE_STATUS.GRACE && (
        <div className="space-y-3">
          <div className="bg-amber-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold text-amber-700 uppercase
                           tracking-wide mb-1">
              Payment due for
            </p>
            <p className="text-sm font-semibold text-amber-900">
              {formatDate(currentPeriodStart)} — {formatDate(currentPeriodEnd)}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in grace period
            </p>
          </div>

          {amountDue && (
            <p className="text-sm font-bold text-primary">
              {formatCurrency(amountDue)} to collect
            </p>
          )}

          {lastPayment && (
            <p className="text-xs text-muted">
              Last paid {formatCurrency(lastPayment.amount_paid)} on {formatDate(lastPayment.paid_on)}
            </p>
          )}

          <RoleGuard>
            <Link
              href={ROUTES.MEMBER_PAY(memberId)}
              className="flex items-center justify-center h-11 rounded-xl
                         bg-warning text-white text-sm font-semibold
                         active:opacity-90 touch-manipulation no-underline"
            >
              Record payment
            </Link>
          </RoleGuard>
        </div>
      )}

      {/* ── OVERDUE STATE ───────────────────────────────────────────── */}
      {status === FEE_STATUS.OVERDUE && (
        <div className="space-y-3">
          <div className="bg-red-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold text-danger uppercase
                           tracking-wide mb-1">
              Overdue for
            </p>
            <p className="text-sm font-semibold text-red-900">
              {formatDate(currentPeriodStart)} — {formatDate(currentPeriodEnd)}
            </p>
            <p className="text-xs text-danger mt-0.5">
              {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} past due
            </p>
          </div>

          {amountDue && (
            <p className="text-sm font-bold text-danger">
              {formatCurrency(amountDue)} overdue
            </p>
          )}

          {lastPayment && (
            <p className="text-xs text-muted">
              Last paid {formatCurrency(lastPayment.amount_paid)} on {formatDate(lastPayment.paid_on)}
            </p>
          )}

          <RoleGuard>
            <Link
              href={ROUTES.MEMBER_PAY(memberId)}
              className="flex items-center justify-center h-11 rounded-xl
                         bg-danger text-white text-sm font-semibold
                         active:opacity-90 touch-manipulation no-underline"
            >
              Record payment
            </Link>
          </RoleGuard>
        </div>
      )}

      {/* ── UNPAID STATE (never paid) ────────────────────────────────── */}
      {status === FEE_STATUS.UNPAID && (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold text-muted uppercase
                           tracking-wide mb-1">
              First payment to collect
            </p>
            <p className="text-sm font-medium text-primary">
              {formatDate(currentPeriodStart)} — {formatDate(currentPeriodEnd)}
            </p>
            {amountDue && (
              <p className="text-xs text-muted mt-0.5">
                {formatCurrency(amountDue)} monthly fee
              </p>
            )}
          </div>

          <p className="text-xs text-muted">
            No payment recorded yet — collect first payment
          </p>

          <RoleGuard>
            <Link
              href={ROUTES.MEMBER_PAY(memberId)}
              className="flex items-center justify-center h-11 rounded-xl
                         bg-primary text-white text-sm font-semibold
                         active:opacity-90 touch-manipulation no-underline"
            >
              Record first payment
            </Link>
          </RoleGuard>
        </div>
      )}
    </div>
  );
}

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
  if (feeInfo.memberStatus === "inactive") {
    return (
      <div className="bg-white px-4 py-4 border-b border-gray-100">
        <h2
          className="text-xs font-semibold text-gray-400 uppercase
                       tracking-wide mb-3"
        >
          Fee Status
        </h2>
        <p className="text-sm text-gray-400">
          No active fee tracking — member is inactive.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white px-4 py-4 border-b border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Fee Status
        </h2>
        <FeeStatusBadge
          status={feeInfo.status}
          daysOverdue={feeInfo.daysOverdue}
          daysLeft={feeInfo.daysLeft}
        />
      </div>

      {/* Current period */}
      <div className="rounded-xl border border-gray-100 p-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">
              {formatDate(feeInfo.currentPeriodStart)} —{" "}
              {formatDate(feeInfo.currentPeriodEnd)}
            </p>
            {feeInfo.status === "paid" ? (
              <p className="text-sm font-semibold text-green-700 mt-0.5">
                {formatCurrency(feeInfo.lastPayment?.amount_paid)} paid
                {feeInfo.lastPayment?.paid_on && (
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    on {formatDate(feeInfo.lastPayment.paid_on)}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {formatCurrency(feeInfo.amountDue)} due
              </p>
            )}
          </div>

          {/* Record Payment button — primary only */}
          {feeInfo.status !== "paid" && (
            <RoleGuard>
              <Link
                href={ROUTES.MEMBER_PAY(memberId)}
                className="h-9 px-4 bg-gray-900 text-white text-sm font-medium
                           rounded-lg flex items-center justify-center
                           active:bg-gray-700 touch-manipulation no-underline"
              >
                Record payment
              </Link>
            </RoleGuard>
          )}
        </div>

        {/* Overdue/grace/unpaid message */}
        {feeInfo.status === FEE_STATUS.OVERDUE && (
  <p className="text-xs text-danger mt-2">
    {feeInfo.daysOverdue} day{feeInfo.daysOverdue !== 1 ? 's' : ''} overdue
  </p>
)}
{feeInfo.status === FEE_STATUS.GRACE && (
  <p className="text-xs text-warning mt-2">
    {feeInfo.daysLeft} day{feeInfo.daysLeft !== 1 ? 's' : ''} remaining in grace period
  </p>
)}
{feeInfo.status === FEE_STATUS.UNPAID && (
  <p className="text-xs text-muted mt-2">
    No payment recorded yet — collect first payment
  </p>
)}
      </div>

      {/* Quick record button when paid — for recording next month early */}
      {feeInfo.status === "paid" && (
        <RoleGuard>
          <div className="mt-2 flex justify-end">
            <Link
              href={ROUTES.MEMBER_PAY(memberId)}
              className="text-xs text-gray-400 underline underline-offset-2
                         touch-manipulation no-underline hover:text-gray-600"
            >
              Record payment
            </Link>
          </div>
        </RoleGuard>
      )}
    </div>
  );
}

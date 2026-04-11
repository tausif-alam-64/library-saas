// lib/audit.js

// Write a record to audit_logs after any significant data change
//
// Parameters:
//   supabase      — the server supabase client from the API route
//   library_id    — which library this action belongs to
//   partner_id    — which partner performed the action
//   action        — what happened: 'create_member', 'record_payment', 'mark_inactive', etc.
//   entity_type   — which table was affected: 'member', 'fee_payment', 'seat_allocation', etc.
//   entity_id     — the UUID of the specific record that was affected
//   old_data      — snapshot of the record BEFORE the change (null for creates)
//   new_data      — snapshot of the record AFTER the change (null for deletes)
//
// This function never throws. If the audit log fails, it logs to console
// (which Sentry captures) but does not interrupt the response to the client.

export async function writeAuditLog(supabase, {
  library_id,
  partner_id,
  action,
  entity_type,
  entity_id,
  old_data = null,
  new_data = null,
}) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        library_id,
        partner_id,
        action,
        entity_type,
        entity_id,
        old_data: old_data ? JSON.parse(JSON.stringify(old_data)) : null,
        new_data: new_data ? JSON.parse(JSON.stringify(new_data)) : null,
      })

    if (error) {
      // Log but do not throw — audit failure must not break the operation
      console.error('[audit] Failed to write audit log:', {
        action,
        entity_type,
        entity_id,
        error: error.message,
      })
    }
  } catch (err) {
    console.error('[audit] Unexpected error writing audit log:', err)
  }
}
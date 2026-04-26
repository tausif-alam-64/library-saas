// app/api/health/route.js

import { NextResponse } from 'next/server'

// Lightweight endpoint for keeping the Vercel function warm.
// Called by UptimeRobot (free) every 5 minutes.
// Returns the current timestamp so each call is provably fresh.
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
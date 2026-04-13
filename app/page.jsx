// app/page.jsx

import { redirect } from 'next/navigation'

// The root URL / serves no content
// Middleware handles unauthenticated users → /login
// This handles authenticated users → /dashboard
export default function RootPage() {
  redirect('/dashboard')
}
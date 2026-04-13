// app/(auth)/login/loading.jsx

export default function LoginLoading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
    }}>
      <div style={{
        width: '320px',
        padding: '2rem',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}>
        {/* Library name skeleton */}
        <div style={{
          height: '20px',
          width: '60%',
          background: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '0.5rem',
        }} />
        <div style={{
          height: '14px',
          width: '40%',
          background: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '2rem',
        }} />

        {/* Email field skeleton */}
        <div style={{
          height: '14px',
          width: '30%',
          background: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '0.5rem',
        }} />
        <div style={{
          height: '44px',
          background: '#f3f4f6',
          borderRadius: '8px',
          marginBottom: '1rem',
        }} />

        {/* Password field skeleton */}
        <div style={{
          height: '14px',
          width: '30%',
          background: '#f3f4f6',
          borderRadius: '4px',
          marginBottom: '0.5rem',
        }} />
        <div style={{
          height: '44px',
          background: '#f3f4f6',
          borderRadius: '8px',
          marginBottom: '1.5rem',
        }} />

        {/* Button skeleton */}
        <div style={{
          height: '48px',
          background: '#f3f4f6',
          borderRadius: '8px',
        }} />
      </div>
    </div>
  )
}
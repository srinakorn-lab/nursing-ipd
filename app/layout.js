import './globals.css'

export const metadata = {
  title: 'IPD Productivity Dashboard',
  description: 'Nursing Workload & Productivity Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}

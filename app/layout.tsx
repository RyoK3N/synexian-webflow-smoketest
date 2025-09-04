export const metadata = {
  title: "Synexian – Webflow Cloud Smoke Test",
  description: "Minimal Next.js app deployed via Webflow Cloud + GitHub."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", padding: 24 }}>
        {children}
      </body>
    </html>
  );
}

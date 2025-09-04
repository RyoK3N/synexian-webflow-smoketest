export const metadata = {
  title: "Synexian – Webflow Cloud Chat",
  description: "Minimal multi-provider chatbot via Webflow Cloud + Next.js."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", background: "#0b0b16", color: "#e7e7ff", padding: 24 }}>
        {children}
      </body>
    </html>
  );
}

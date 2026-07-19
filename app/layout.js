import "./globals.css";

export const metadata = {
  title: "Marketing Brain",
  description: "Your AI marketing team — one request in, a full campaign out.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

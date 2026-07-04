import type { ReactNode } from "react";

export const metadata = {
  title: "rf-api",
  description: "API para renta fija argentina"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

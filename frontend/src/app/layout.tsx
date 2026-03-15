import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nobel — AI Learning Analytics",
  description: "Turn AI tutoring conversations into actionable teaching insights",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "12px", fontFamily: "Inter, sans-serif", fontSize: "14px" },
          }}
        />
      </body>
    </html>
  );
}

import "./globals.css";
import { AuthProvider } from "./context/AuthContext";

export const metadata = {
  title: "SimplyFin",
  description: "Track your expenses with ease.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

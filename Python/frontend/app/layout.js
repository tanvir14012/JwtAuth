import "./globals.css";
import Nav from "../components/nav";
import SessionLockListener from "../components/session-lock-listener";

export const metadata = {
  title: "JwtAuth Node",
  description: "JWT auth demo using Next.js + Express + MongoDB"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <Nav />
          <SessionLockListener />
          {children}
        </div>
      </body>
    </html>
  );
}


import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "./NavBar";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "CRM/SFA System",
  description: "営業活動推進システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <header className={styles.header}>CRM/SFA System</header>
        <NavBar />
        <main className={styles.main}>{children}</main>
      </body>
    </html>
  );
}

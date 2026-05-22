import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "نشان‌شده‌ها | گنجورک",
  description: "شعرهای ذخیره‌شده و اخیراً دیده‌شده در گنجورک.",
};

export default function SavedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

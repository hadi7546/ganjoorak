import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "شعر روز | گنجورک",
  description: "شعر روز گنجورک؛ هر روز یک شعر ثابت برای خواندن و گوش دادن.",
};

export default function TodayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "جستجو",
  description:
    "جستجوی متنی و معنایی در اشعار گنجور، شاعران محلی و اکولالیا.",
};

export default function SearchLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}

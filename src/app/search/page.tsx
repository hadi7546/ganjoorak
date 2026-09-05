import { Suspense } from "react";
import SearchPage from "@/components/SearchPage";
import "@/styles/SearchPage.css";

const SearchFallback = () => (
  <div className="search-page" dir="rtl">
    <main className="search-page-shell" aria-busy="true">
      <p className="search-meta">در حال بارگذاری جستجو…</p>
    </main>
  </div>
);

export default function SearchRoutePage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPage />
    </Suspense>
  );
}

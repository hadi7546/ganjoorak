import { Suspense } from "react";
import SearchPage from "@/components/SearchPage";
import "@/styles/SearchPage.css";

export default function SearchRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="search-page" dir="rtl">
          <main className="search-page-shell">
            <p className="search-page-status">در حال بارگذاری جستجو...</p>
          </main>
        </div>
      }
    >
      <SearchPage />
    </Suspense>
  );
}

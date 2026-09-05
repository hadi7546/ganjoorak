import { Suspense } from "react";
import SearchPage from "@/components/SearchPage";
import "@/styles/SearchPage.css";

const SearchFallback = () => (
  <div className="search-page" dir="rtl">
    <main className="search-page-shell" aria-busy="true">
      <header className="search-page-header">
        <h1>جستجو در شعر</h1>
        <p>واژه، مصرع یا نام شاعر را بنویسید؛ مثلاً «شعر حافظ درمورد عشق».</p>
      </header>
      <div className="search-sticky-sentinel" aria-hidden="true" />
      <div className="search-bar">
        <div className="search-bar-form">
          <div className="search-bar-field" />
          <div className="search-bar-submit search-skeleton" style={{ width: "6rem" }} />
        </div>
      </div>
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

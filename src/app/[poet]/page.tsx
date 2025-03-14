"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import PoemViewer from "@/components/PoemViewer";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import customApi from "@/api/CustomApi";
import { Poem } from "@/types/poem";
import { Poet, isValidPoet, poetNames } from "@/types/poets";

const INITIAL_POEMS_COUNT = 3;
const PREFETCH_THRESHOLD = 2;
const BATCH_SIZE = 2;

export default function PoetPage() {
  const params = useParams();
  const poetSlug = params.poet as string;

  // Validate the poet parameter
  if (!isValidPoet(poetSlug)) {
    notFound();
  }

  const poet = poetSlug as Poet;
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Fetch initial poems
  const fetchInitialPoems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch poems one by one
      const fetchedPoems: Poem[] = [];

      for (let i = 0; i < INITIAL_POEMS_COUNT; i++) {
        try {
          const randomPoem = await customApi.getRandomPoem(poet);
          fetchedPoems.push(randomPoem);
        } catch (err) {
          console.error("Error fetching poem:", err);
        }
      }

      if (fetchedPoems.length > 0) {
        setPoems(fetchedPoems);
        setLoading(false);
      } else {
        throw new Error("Could not fetch any poems");
      }
    } catch (err) {
      console.error("Failed to fetch initial poems:", err);
      setError("متأسفانه در بارگیری شعرها مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
      setLoading(false);
    }
  };

  // Fetch initial poems
  useEffect(() => {
    fetchInitialPoems();
  }, [poet]);

  // Fetch more poems when approaching the end
  useEffect(() => {
    const shouldFetchMore =
      currentPoemIndex >= poems.length - PREFETCH_THRESHOLD &&
      poems.length > 0 &&
      !isFetchingMore;

    if (shouldFetchMore) {
      const fetchMorePoems = async () => {
        try {
          setIsFetchingMore(true);

          // Fetch poems one by one
          const newPoems: Poem[] = [];

          for (let i = 0; i < BATCH_SIZE; i++) {
            try {
              const randomPoem = await customApi.getRandomPoem(poet);
              newPoems.push(randomPoem);
            } catch (err) {
              console.error("Error fetching additional poem:", err);
            }
          }

          if (newPoems.length > 0) {
            setPoems((prevPoems) => [...prevPoems, ...newPoems]);
          }
        } catch (err) {
          console.error("Failed to fetch more poems:", err);
        } finally {
          setIsFetchingMore(false);
        }
      };

      fetchMorePoems();
    }
  }, [currentPoemIndex, poems.length, isFetchingMore, poet]);

  const handleNext = () => {
    setCurrentPoemIndex((prevIndex) => prevIndex + 1);
  };

  const handlePrevious = () => {
    if (currentPoemIndex > 0) {
      setCurrentPoemIndex((prevIndex) => prevIndex - 1);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={fetchInitialPoems} />;
  }

  return (
    <main className="h-screen overflow-hidden">
      {poems.length > 0 && (
        <PoemViewer
          poem={poems[currentPoemIndex]}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isFirst={currentPoemIndex === 0}
          isLast={currentPoemIndex === poems.length - 1}
          isModern={true}
          poet={poet}
          backUrl="/"
        />
      )}
    </main>
  );
}

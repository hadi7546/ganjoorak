'use client';

export const runtime = 'edge';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import PoemViewer from "@/components/PoemViewer";
import LoadingScreen from "@/components/LoadingScreen";
import ErrorScreen from "@/components/ErrorScreen";
import customApi from "@/api/CustomApi";
import ganjoorApi from "@/api/GanjoorApi";
import { Poem } from "@/types/poem";
import { PoetSlug, isValidPoetSlug, poetNames } from "@/types/poet";

const INITIAL_POEMS_COUNT = 3;
const PREFETCH_THRESHOLD = 2;
const BATCH_SIZE = 2;

export default function PoetPage() {
  const params = useParams();
  const router = useRouter();
  const poetSlug = params.poet as string;
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [isGanjoor, setIsGanjoor] = useState<boolean | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Check if the poet exists in Ganjoor or is a custom poet
  useEffect(() => {
    const checkPoetSource = async () => {
      try {
        // First check if it's a valid custom poet
        if (isValidPoetSlug(poetSlug)) {
          setIsGanjoor(false);
          return;
        }

        // If not a custom poet, try Ganjoor
        try {
          // Check if the poet slug is a reasonable string before making API call
          if (!poetSlug || poetSlug.length < 2 || /[^a-zA-Z0-9-]/.test(poetSlug)) {
            setNotFound(true);
            return;
          }

          const ganjoorPoetId = await ganjoorApi.getRandomPoemByPoet(poetSlug);

          if (ganjoorPoetId) {
            setIsGanjoor(true);
            return;
          }
          setNotFound(true);
        } catch (err: any) {
          // If it's a 404 error or any other error indicating poet not found
          if (err.response?.status === 404 || err.message?.includes('not found')) {
            setNotFound(true);
            return;
          } else {
            // For other errors, show error message
            setError("متأسفانه در بررسی اطلاعات شاعر در گنجور مشکلی پیش آمد");
            return;
          }
        }

        // If we get here and no valid poet was found, set not found
        setNotFound(true);
      } catch (err) {
        console.error("Error in checkPoetSource:", err);
        setNotFound(true);
      }
    };

    // Run the check immediately
    checkPoetSource();
  }, [poetSlug]);

  // Fetch initial poems only if we have a valid source and poet is found
  useEffect(() => {
    if (isGanjoor === null || notFound) return;

    const fetchInitialPoems = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedPoems: Poem[] = [];

        // Fetch initial poems in parallel for better performance
        const initialFetchPromises = [];
        for (let i = 0; i < INITIAL_POEMS_COUNT; i++) {
          if (isGanjoor) {
            initialFetchPromises.push(
              (async () => {
                try {
                  // First get random poem ID
                  const randomPoemInitial = await ganjoorApi.getRandomPoemByPoet(poetSlug);
                  // Then fetch complete poem data with recitations
                  const fullPoem = await ganjoorApi.getPoemById(randomPoemInitial.id);
                  return fullPoem;
                } catch (err) {
                  console.error("Error fetching poem:", err);
                  return null;
                }
              })()
            );
          } else {
            initialFetchPromises.push(
              (async () => {
                try {
                  const randomPoem = await customApi.getRandomPoem(poetSlug as PoetSlug);
                  return randomPoem;
                } catch (err) {
                  console.error("Error fetching poem:", err);
                  return null;
                }
              })()
            );
          }
        }

        // Wait for all poems to be fetched
        const fetchedPoemsResults = await Promise.all(initialFetchPromises);

        // Filter out null values
        const validPoems = fetchedPoemsResults.filter(poem => poem !== null) as Poem[];

        if (validPoems.length > 0) {
          setPoems(validPoems);
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

    fetchInitialPoems();
  }, [poetSlug, isGanjoor, notFound]);

  // Fetch more poems when approaching the end
  useEffect(() => {
    const shouldFetchMore = isGanjoor !== null &&
      !notFound &&
      poems.length > 0 &&
      currentPoemIndex >= poems.length - PREFETCH_THRESHOLD &&
      !isFetchingMore;

    if (shouldFetchMore) {
      const fetchMorePoems = async () => {
        try {
          setIsFetchingMore(true);
          const newPoemsPromises = [];

          for (let i = 0; i < BATCH_SIZE; i++) {
            if (isGanjoor) {
              newPoemsPromises.push(
                (async () => {
                  try {
                    const randomPoemInitial = await ganjoorApi.getRandomPoemByPoet(poetSlug);
                    const fullPoem = await ganjoorApi.getPoemById(randomPoemInitial.id);
                    return fullPoem;
                  } catch (err) {
                    console.error("Error fetching additional poem:", err);
                    return null;
                  }
                })()
              );
            } else {
              newPoemsPromises.push(
                (async () => {
                  try {
                    const randomPoem = await customApi.getRandomPoem(poetSlug as PoetSlug);
                    return randomPoem;
                  } catch (err) {
                    console.error("Error fetching additional poem:", err);
                    return null;
                  }
                })()
              );
            }
          }

          const newPoemsResults = await Promise.all(newPoemsPromises);
          const validNewPoems = newPoemsResults.filter(poem => poem !== null) as Poem[];

          if (validNewPoems.length > 0) {
            setPoems(prevPoems => [...prevPoems, ...validNewPoems]);
          }
        } catch (err) {
          console.error("Failed to fetch more poems:", err);
        } finally {
          setIsFetchingMore(false);
        }
      };

      fetchMorePoems();
    }
  }, [currentPoemIndex, poems.length, isGanjoor, notFound, poetSlug, isFetchingMore]);

  // Handle next poem
  const handleNext = () => {
    setCurrentPoemIndex(prevIndex => prevIndex + 1);
  };

  // Handle previous poem
  const handlePrevious = () => {
    if (currentPoemIndex > 0) {
      setCurrentPoemIndex(currentPoemIndex - 1);
    }
  };

  if (notFound) {
    return (
      <ErrorScreen
        message="شاعر مورد نظر یافت نشد"
        onRetry={() => router.push('/')}
      />
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;
  }

  if (!poems.length) {
    return <ErrorScreen message="متأسفانه شعری یافت نشد" onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1">
        <PoemViewer
          poem={poems[currentPoemIndex]}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isFirst={currentPoemIndex === 0}
          isLast={currentPoemIndex === poems.length - 1}
          isModern={!isGanjoor}
          poetSlug={poetSlug as PoetSlug}
          isPoetPage={true}
        />
      </div>
    </div>
  );
}

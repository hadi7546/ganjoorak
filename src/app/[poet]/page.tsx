"use client";

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

  // Check if the poet exists in Ganjoor or is a custom poet
  useEffect(() => {
    const checkPoetSource = async () => {
      try {
        console.log('Checking poet source for:', poetSlug);

        // First check if it's a valid custom poet
        if (isValidPoetSlug(poetSlug)) {
          console.log('Valid custom poet found:', poetSlug);
          setIsGanjoor(false);
          return;
        }
        console.log('Not a custom poet, checking Ganjoor...');

        // If not a custom poet, try Ganjoor
        try {
          // Check if the poet slug is a reasonable string before making API call
          if (!poetSlug || poetSlug.length < 2 || /[^a-zA-Z0-9-]/.test(poetSlug)) {
            console.log('Invalid poet slug format:', poetSlug);
            setNotFound(true);
            return;
          }

          const ganjoorPoetId = await ganjoorApi.getRandomPoemByPoet(poetSlug);
          console.log('Ganjoor poet ID:', ganjoorPoetId);

          if (ganjoorPoetId) {
            console.log('Valid Ganjoor poet found:', poetSlug);
            setIsGanjoor(true);
            return;
          }
          console.log('Invalid Ganjoor poet ID:', ganjoorPoetId);
          setNotFound(true);
        } catch (err: any) {
          console.error("Error checking Ganjoor poet:", err);
          // If it's a 404 error or any other error indicating poet not found
          if (err.response?.status === 404 || err.message?.includes('not found')) {
            console.log('Poet not found in Ganjoor');
            setNotFound(true);
            return;
          } else {
            // For other errors, show error message
            setError("متأسفانه در بررسی اطلاعات شاعر در گنجور مشکلی پیش آمد");
            return;
          }
        }

        // If we get here and no valid poet was found, set not found
        console.log('No valid poet found');
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

        for (let i = 0; i < INITIAL_POEMS_COUNT; i++) {
          try {
            if (isGanjoor) {
              // First get random poem ID
              const randomPoem = await ganjoorApi.getRandomPoemByPoet(poetSlug);
              // Then fetch complete poem data
              const fullPoem = await ganjoorApi.getPoemById(randomPoem.id);
              fetchedPoems.push(fullPoem);
            } else {
              const randomPoem = await customApi.getRandomPoem(poetSlug as PoetSlug);
              fetchedPoems.push(randomPoem);
            }
          } catch (err) {
            console.error("Error fetching poem:", err);
          }
        }

        if (fetchedPoems.length > 0) {
          setPoems(fetchedPoems);
        } else {
          throw new Error("Could not fetch any poems");
        }
      } catch (err) {
        console.error("Failed to fetch initial poems:", err);
        setError("متأسفانه در بارگیری شعرها مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPoems();
  }, [poetSlug, isGanjoor, notFound]);

  // Handle next poem
  const handleNext = async () => {
    if (isGanjoor === null) return;

    try {
      let randomPoem: Poem;
      if (isGanjoor) {
        // First get random poem ID
        const initialPoem = await ganjoorApi.getRandomPoemByPoet(poetSlug);
        // Then fetch complete poem data
        randomPoem = await ganjoorApi.getPoemById(initialPoem.id);
      } else {
        randomPoem = await customApi.getRandomPoem(poetSlug as PoetSlug);
      }
      setPoems([...poems, randomPoem]);
      setCurrentPoemIndex(currentPoemIndex + 1);
    } catch (err) {
      console.error("Error fetching next poem:", err);
      setError("متأسفانه در بارگیری شعر بعدی مشکلی پیش آمد. لطفاً دوباره تلاش کنید.");
    }
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

import { Vazirmatn } from "next/font/google";
import { Century, Poet } from "@/types/poet";
import ganjoorApi from "@/api/GanjoorApi";
import customApi from "@/api/CustomApi";
import PoetsContent from "@/components/PoetsContent";
import LoadingScreen from "@/components/LoadingScreen";
import "@/styles/Poets.css";

const vazirmatn = Vazirmatn({ subsets: ["arabic"] });

async function getCenturies(): Promise<Century[]> {
  try {
    // Add timeout to prevent build hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Centuries fetch timeout")), 10000),
    );

    const centuriesPromise = ganjoorApi.getCenturies();
    const centuries = await Promise.race([centuriesPromise, timeoutPromise]);

    return centuries.sort((a, b) => a.halfCenturyOrder - b.halfCenturyOrder);
  } catch (error) {
    console.error("Error fetching centuries:", error);
    return [];
  }
}

async function getCustomPoets(): Promise<Poet[]> {
  try {
    // Add timeout to prevent build hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Custom poets fetch timeout")), 15000),
    );

    const poetsPromise = customApi.getPoets();
    const poets = await Promise.race([poetsPromise, timeoutPromise]);

    return poets;
  } catch (error) {
    console.error("Error fetching custom poets:", error);
    return [];
  }
}

export default async function PoetsPage() {
  let centuries: Century[] = [];
  let customPoets: Poet[] = [];

  try {
    // Add overall timeout for the page
    const pageTimeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Poets page timeout")), 20000),
    );

    const dataPromise = Promise.all([getCenturies(), getCustomPoets()]);

    [centuries, customPoets] = await Promise.race([
      dataPromise,
      pageTimeoutPromise,
    ]);
  } catch (error) {
    console.error("Error loading poets page data:", error);
    // Return empty arrays on timeout or error to prevent build failure
    centuries = [];
    customPoets = [];
  }

  return (
    <div className={`poets-container ${vazirmatn.className}`}>
      <h1 className="poets-title">شاعران</h1>
      <PoetsContent centuries={centuries} customPoets={customPoets} />
    </div>
  );
}

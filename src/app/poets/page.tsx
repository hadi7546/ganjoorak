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
    const centuries = await ganjoorApi.getCenturies();
    return centuries.sort((a, b) => a.halfCenturyOrder - b.halfCenturyOrder);
  } catch (error) {
    console.error("Error fetching centuries:", error);
    return [];
  }
}

async function getCustomPoets(): Promise<Poet[]> {
  try {
    const poets = await customApi.getPoets();
    return poets;
  } catch (error) {
    console.error("Error fetching custom poets:", error);
    return [];
  }
}

export default async function PoetsPage() {
  // Fetch data in parallel for better performance
  const [centuries, customPoets] = await Promise.all([
    getCenturies(),
    getCustomPoets(),
  ]);

  return (
    <div className={`poets-container ${vazirmatn.className}`}>
      <h1 className="poets-title">شاعران</h1>
      <PoetsContent centuries={centuries} customPoets={customPoets} />
    </div>
  );
}

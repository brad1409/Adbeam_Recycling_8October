import { db } from "./firebaseConfig.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const PLASTIC_IMPACT = 0.15;
const GLASS_IMPACT = 0.25;
const ALUMINUM_IMPACT = 0.35;
const PAPER_IMPACT = 0.1;
const CARDBOARD_IMPACT = 0.12;
const METAL_IMPACT = 0.3;
const ELECTRONICS_IMPACT = 0.5;

export async function calculateImpactScore(userId) {
  try {
    const q = query(
      collection(db, "recyclingActivities"),
      where("userId", "==", userId),
      orderBy("timestamp", "asc")
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return 0;
    }

    let totalItems = 0;
    const materialCounts = {
      plastic: 0,
      glass: 0,
      aluminum: 0,
      paper: 0,
      cardboard: 0,
      metal: 0,
      electronics: 0,
    };

    let firstScanDate = null;
    let lastScanDate = null;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      totalItems++;

      const material = data.material?.toLowerCase() || "other";
      if (materialCounts.hasOwnProperty(material)) {
        materialCounts[material]++;
      }

      const timestamp = data.timestamp?.toDate();
      if (timestamp) {
        if (!firstScanDate || timestamp < firstScanDate) {
          firstScanDate = timestamp;
        }
        if (!lastScanDate || timestamp > lastScanDate) {
          lastScanDate = timestamp;
        }
      }
    });

    if (totalItems === 0) {
      return 0;
    }

    const daysActive = firstScanDate && lastScanDate
      ? Math.floor((lastScanDate - firstScanDate) / (1000 * 60 * 60 * 24)) + 1
      : 1;

    const x = Math.min(1, daysActive / 30);

    const materialTypes = Object.values(materialCounts).filter(count => count > 0).length;
    const materialDiversity = materialTypes / Object.keys(materialCounts).length;
    const y = Math.sqrt(materialDiversity);

    let integralValue = 0.5;
    if (y > 0) {
      integralValue = 0.5 * Math.log(Math.sqrt(1 + y * y) + 1) / y;
    }

    const co2Saved =
      materialCounts.plastic * PLASTIC_IMPACT +
      materialCounts.glass * GLASS_IMPACT +
      materialCounts.aluminum * ALUMINUM_IMPACT +
      materialCounts.paper * PAPER_IMPACT +
      materialCounts.cardboard * CARDBOARD_IMPACT +
      materialCounts.metal * METAL_IMPACT +
      materialCounts.electronics * ELECTRONICS_IMPACT;

    const score = Math.min(100, integralValue * co2Saved * 10);

    return Math.round(score * 100) / 100;
  } catch (error) {
    console.error("Impact calculation failed:", error);
    return 0;
  }
}

export function calculateCO2Impact(material, quantity = 1) {
  const impactMap = {
    plastic: PLASTIC_IMPACT,
    glass: GLASS_IMPACT,
    aluminum: ALUMINUM_IMPACT,
    paper: PAPER_IMPACT,
    cardboard: CARDBOARD_IMPACT,
    metal: METAL_IMPACT,
    electronics: ELECTRONICS_IMPACT,
  };

  const materialLower = material?.toLowerCase() || "";
  const impact = impactMap[materialLower] || 0.1;

  return impact * quantity;
}

export async function getUserEnvironmentalStats(userId) {
  try {
    const q = query(
      collection(db, "recyclingActivities"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);

    let totalCO2Saved = 0;
    const materialBreakdown = {
      plastic: 0,
      glass: 0,
      aluminum: 0,
      paper: 0,
      cardboard: 0,
      metal: 0,
      electronics: 0,
    };

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const co2Impact = data.co2Impact || 0;
      totalCO2Saved += co2Impact;

      const material = data.material?.toLowerCase() || "other";
      if (materialBreakdown.hasOwnProperty(material)) {
        materialBreakdown[material] += co2Impact;
      }
    });

    const impactScore = await calculateImpactScore(userId);

    return {
      totalCO2Saved: Math.round(totalCO2Saved * 100) / 100,
      impactScore,
      materialBreakdown,
      totalItems: querySnapshot.size,
    };
  } catch (error) {
    console.error("Error getting environmental stats:", error);
    return {
      totalCO2Saved: 0,
      impactScore: 0,
      materialBreakdown: {},
      totalItems: 0,
    };
  }
}

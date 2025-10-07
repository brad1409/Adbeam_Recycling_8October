import { db } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  increment,
  getDocs,
  query,
  where,
  limit,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/**
 * QR/Barcode Scanner Integration with Firebase
 */

// Process scanned item
export async function processScan(userId, scanData) {
  try {
    const { barcode, material, qrData } = scanData

    // Get user data
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      throw new Error("User not found")
    }

    const userData = userSnap.data()

    // Calculate points based on material
    const points = calculatePoints(material)
    const co2Impact = calculateCO2Impact(material)

    // Create recycling activity
    const activityData = {
      userId,
      material,
      barcode: barcode || qrData,
      points,
      co2Impact,
      location: "Campus Scanner",
      timestamp: serverTimestamp(),
      verified: true,
    }

    const activityRef = await addDoc(collection(db, "recyclingActivities"), activityData)

    // Update user stats
    await updateDoc(userRef, {
      pointsBalance: increment(points),
      totalPointsEarned: increment(points),
      totalItemsRecycled: increment(1),
      totalCO2Saved: increment(co2Impact),
      lastActivityDate: serverTimestamp(),
    })

    // Update university stats if user has university
    if (userData.university) {
      const universityRef = doc(db, "universities", userData.university)
      await updateDoc(universityRef, {
        totalPoints: increment(points),
        totalItemsRecycled: increment(1),
        totalCO2Saved: increment(co2Impact),
      }).catch(() => {
        // University doc might not exist, that's okay
        console.log("University stats not updated")
      })
    }

    // Update residence hall stats if user has residence
    if (userData.residenceHall) {
      const residenceRef = doc(db, "residenceHalls", userData.residenceHall)
      await updateDoc(residenceRef, {
        totalPoints: increment(points),
        totalItemsRecycled: increment(1),
      }).catch(() => {
        console.log("Residence stats not updated")
      })
    }

    // Record transaction
    await addDoc(collection(db, "transactions"), {
      userId,
      type: "recycling",
      amount: points,
      description: `Recycled ${material}`,
      activityId: activityRef.id,
      timestamp: serverTimestamp(),
    })

    return {
      success: true,
      points,
      co2Impact,
      activityId: activityRef.id,
      newBalance: userData.pointsBalance + points,
      totalItems: (userData.totalItemsRecycled || 0) + 1,
      totalCO2: (userData.totalCO2Saved || 0) + co2Impact,
    }
  } catch (error) {
    console.error("Error processing scan:", error)
    throw error
  }
}

// Calculate points based on material type
function calculatePoints(material) {
  const pointsMap = {
    plastic: 5,
    glass: 10,
    aluminum: 7,
    paper: 3,
    cardboard: 4,
    metal: 8,
    electronics: 15,
  }

  return pointsMap[material.toLowerCase()] || 5
}

// Calculate CO2 impact
function calculateCO2Impact(material) {
  const co2Map = {
    plastic: 0.5,
    glass: 0.3,
    aluminum: 0.8,
    paper: 0.2,
    cardboard: 0.25,
    metal: 0.7,
    electronics: 1.2,
  }

  return co2Map[material.toLowerCase()] || 0.3
}

// Verify barcode/QR code
export async function verifyCode(code) {
  try {
    // Check if code has been scanned recently (prevent duplicates)
    const recentScans = await getDocs(
      query(
        collection(db, "recyclingActivities"),
        where("barcode", "==", code),
        where("timestamp", ">", new Date(Date.now() - 60000)), // Last minute
        limit(1),
      ),
    )

    if (!recentScans.empty) {
      return {
        valid: false,
        message: "This item was recently scanned. Please wait before scanning again.",
      }
    }

    return {
      valid: true,
      message: "Code verified",
    }
  } catch (error) {
    console.error("Error verifying code:", error)
    return {
      valid: true, // Allow scan even if verification fails
      message: "Verification skipped",
    }
  }
}

// Get scanning statistics
export async function getScanningStats(userId) {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      throw new Error("User not found")
    }

    const userData = userSnap.data()

    return {
      totalScans: userData.totalItemsRecycled || 0,
      totalPoints: userData.totalPointsEarned || 0,
      totalCO2Saved: userData.totalCO2Saved || 0,
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
    }
  } catch (error) {
    console.error("Error fetching scanning stats:", error)
    throw error
  }
}

import { db } from "./firebaseConfig.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Add recycling activity
export const addRecyclingActivity = async (userId, activityData) => {
  try {
    // Add activity to recycling_activities collection
    const activityRef = await addDoc(collection(db, "recycling_activities"), {
      userId,
      material: activityData.material,
      quantity: activityData.quantity || 1,
      points: activityData.points,
      co2Saved: activityData.co2Saved || 0,
      location: activityData.location || "Unknown",
      barcode: activityData.barcode || null,
      timestamp: serverTimestamp(),
      verified: true,
    })

    // Update user stats
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      pointsBalance: increment(activityData.points),
      totalPointsEarned: increment(activityData.points),
      totalItemsRecycled: increment(activityData.quantity || 1),
      co2Saved: increment(activityData.co2Saved || 0),
      lastActivity: serverTimestamp(),
    })

    return {
      success: true,
      activityId: activityRef.id,
    }
  } catch (error) {
    console.error("Error adding recycling activity:", error)
    return {
      success: false,
      message: "Failed to record activity",
    }
  }
}

// Get user recycling history
export const getUserRecyclingHistory = async (userId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, "recycling_activities"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    )

    const querySnapshot = await getDocs(q)
    const activities = []

    querySnapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return {
      success: true,
      activities,
    }
  } catch (error) {
    console.error("Error getting recycling history:", error)
    return {
      success: false,
      activities: [],
    }
  }
}

// Get user stats
export const getUserStats = async (userId) => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const data = userSnap.data()
      return {
        success: true,
        stats: {
          pointsBalance: data.pointsBalance || 0,
          totalPointsEarned: data.totalPointsEarned || 0,
          totalItemsRecycled: data.totalItemsRecycled || 0,
          co2Saved: data.co2Saved || 0,
        },
      }
    }

    return {
      success: false,
      stats: null,
    }
  } catch (error) {
    console.error("Error getting user stats:", error)
    return {
      success: false,
      stats: null,
    }
  }
}

// Get leaderboard
export const getLeaderboard = async (limitCount = 10) => {
  try {
    const q = query(collection(db, "users"), orderBy("totalPointsEarned", "desc"), limit(limitCount))

    const querySnapshot = await getDocs(q)
    const leaderboard = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      leaderboard.push({
        id: doc.id,
        displayName: data.displayName,
        totalPointsEarned: data.totalPointsEarned || 0,
        totalItemsRecycled: data.totalItemsRecycled || 0,
      })
    })

    return {
      success: true,
      leaderboard,
    }
  } catch (error) {
    console.error("Error getting leaderboard:", error)
    return {
      success: false,
      leaderboard: [],
    }
  }
}

// Redeem reward
export const redeemReward = async (userId, rewardData) => {
  try {
    // Check if user has enough points
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return {
        success: false,
        message: "User not found",
      }
    }

    const userData = userSnap.data()
    if (userData.pointsBalance < rewardData.pointsCost) {
      return {
        success: false,
        message: "Insufficient points",
      }
    }

    // Create redemption record
    const redemptionRef = await addDoc(collection(db, "reward_redemptions"), {
      userId,
      rewardId: rewardData.rewardId,
      rewardName: rewardData.rewardName,
      pointsCost: rewardData.pointsCost,
      status: "pending",
      timestamp: serverTimestamp(),
    })

    // Deduct points from user
    await updateDoc(userRef, {
      pointsBalance: increment(-rewardData.pointsCost),
    })

    return {
      success: true,
      redemptionId: redemptionRef.id,
    }
  } catch (error) {
    console.error("Error redeeming reward:", error)
    return {
      success: false,
      message: "Failed to redeem reward",
    }
  }
}

// Get user redemption history
export const getUserRedemptions = async (userId) => {
  try {
    const q = query(collection(db, "reward_redemptions"), where("userId", "==", userId), orderBy("timestamp", "desc"))

    const querySnapshot = await getDocs(q)
    const redemptions = []

    querySnapshot.forEach((doc) => {
      redemptions.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return {
      success: true,
      redemptions,
    }
  } catch (error) {
    console.error("Error getting redemptions:", error)
    return {
      success: false,
      redemptions: [],
    }
  }
}

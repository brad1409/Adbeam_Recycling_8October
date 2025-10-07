import { db } from "./firebaseConfig.js"
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore"

/**
 * Leaderboard Management with Firebase
 */

// Get individual leaderboard
export async function getIndividualLeaderboard(period = "all", university = "all", limitCount = 50) {
  try {
    let q = collection(db, "users")

    // Apply university filter
    if (university !== "all") {
      q = query(q, where("university", "==", university))
    }

    // Apply period filter
    if (period !== "all") {
      const startDate = getPeriodStartDate(period)
      q = query(q, where("lastActivityDate", ">=", startDate))
    }

    // Order by points and limit
    q = query(q, orderBy("pointsBalance", "desc"), limit(limitCount))

    const snapshot = await getDocs(q)
    const leaderboard = []

    snapshot.forEach((doc, index) => {
      const data = doc.data()
      leaderboard.push({
        rank: index + 1,
        userId: doc.id,
        name: data.displayName || "Anonymous",
        university: data.university || "Unknown",
        points: data.pointsBalance || 0,
        itemsRecycled: data.totalItemsRecycled || 0,
        co2Saved: data.totalCO2Saved || 0,
        avatar: data.photoURL || null,
      })
    })

    return leaderboard
  } catch (error) {
    console.error("Error fetching individual leaderboard:", error)
    throw error
  }
}

// Get residence hall leaderboard
export async function getResidenceLeaderboard(period = "all", university = "all") {
  try {
    let q = collection(db, "residenceHalls")

    if (university !== "all") {
      q = query(q, where("university", "==", university))
    }

    q = query(q, orderBy("totalPoints", "desc"), limit(20))

    const snapshot = await getDocs(q)
    const leaderboard = []

    snapshot.forEach((doc, index) => {
      const data = doc.data()
      leaderboard.push({
        rank: index + 1,
        hallId: doc.id,
        name: data.name,
        university: data.university,
        totalPoints: data.totalPoints || 0,
        memberCount: data.memberCount || 0,
        avgPoints: data.memberCount ? (data.totalPoints / data.memberCount).toFixed(1) : 0,
      })
    })

    return leaderboard
  } catch (error) {
    console.error("Error fetching residence leaderboard:", error)
    throw error
  }
}

// Get university leaderboard
export async function getUniversityLeaderboard(period = "all") {
  try {
    const q = query(collection(db, "universities"), orderBy("totalPoints", "desc"), limit(10))

    const snapshot = await getDocs(q)
    const leaderboard = []

    snapshot.forEach((doc, index) => {
      const data = doc.data()
      leaderboard.push({
        rank: index + 1,
        universityId: doc.id,
        name: data.name,
        location: data.location,
        totalPoints: data.totalPoints || 0,
        studentCount: data.studentCount || 0,
        avgPoints: data.studentCount ? (data.totalPoints / data.studentCount).toFixed(1) : 0,
      })
    })

    return leaderboard
  } catch (error) {
    console.error("Error fetching university leaderboard:", error)
    throw error
  }
}

// Subscribe to real-time leaderboard updates
export function subscribeToLeaderboard(type, callback, options = {}) {
  const { period = "all", university = "all", limitCount = 50 } = options

  let collectionName
  switch (type) {
    case "individual":
      collectionName = "users"
      break
    case "residence":
      collectionName = "residenceHalls"
      break
    case "university":
      collectionName = "universities"
      break
    default:
      throw new Error("Invalid leaderboard type")
  }

  let q = collection(db, collectionName)

  if (type === "individual" && university !== "all") {
    q = query(q, where("university", "==", university))
  }

  const orderField = type === "individual" ? "pointsBalance" : "totalPoints"
  q = query(q, orderBy(orderField, "desc"), limit(limitCount))

  return onSnapshot(q, (snapshot) => {
    const data = []
    snapshot.forEach((doc, index) => {
      data.push({
        rank: index + 1,
        id: doc.id,
        ...doc.data(),
      })
    })
    callback(data)
  })
}

// Get user's rank
export async function getUserRank(userId, university = "all") {
  try {
    let q = collection(db, "users")

    if (university !== "all") {
      q = query(q, where("university", "==", university))
    }

    q = query(q, orderBy("pointsBalance", "desc"))

    const snapshot = await getDocs(q)
    let rank = 0

    snapshot.forEach((doc, index) => {
      if (doc.id === userId) {
        rank = index + 1
      }
    })

    return rank
  } catch (error) {
    console.error("Error getting user rank:", error)
    return 0
  }
}

// Helper function to get period start date
function getPeriodStartDate(period) {
  const now = new Date()

  switch (period) {
    case "week":
      return new Date(now.setDate(now.getDate() - 7))
    case "month":
      return new Date(now.setMonth(now.getMonth() - 1))
    case "semester":
      return new Date(now.setMonth(now.getMonth() - 4))
    default:
      return new Date(0) // Beginning of time
  }
}

// Search leaderboard
export async function searchLeaderboard(searchTerm, type = "individual") {
  try {
    const collectionName = type === "individual" ? "users" : type === "residence" ? "residenceHalls" : "universities"

    const q = query(collection(db, collectionName))
    const snapshot = await getDocs(q)

    const results = []
    const searchLower = searchTerm.toLowerCase()

    snapshot.forEach((doc) => {
      const data = doc.data()
      const name = (data.displayName || data.name || "").toLowerCase()
      const university = (data.university || "").toLowerCase()

      if (name.includes(searchLower) || university.includes(searchLower)) {
        results.push({
          id: doc.id,
          ...data,
        })
      }
    })

    return results
  } catch (error) {
    console.error("Error searching leaderboard:", error)
    return []
  }
}

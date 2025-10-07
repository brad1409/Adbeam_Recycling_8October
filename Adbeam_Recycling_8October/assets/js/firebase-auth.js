import { auth, db } from "./firebaseConfig.js"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"

// User data structure for Firestore
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, "users", userId)
    await setDoc(userRef, {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      displayName: `${userData.firstName} ${userData.lastName}`,
      studentId: userData.studentId || null,
      pointsBalance: 0,
      totalPointsEarned: 0,
      totalItemsRecycled: 0,
      co2Saved: 0,
      accountStatus: "active",
      emailVerified: false,
      isAdmin: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      recyclingHistory: [],
      achievements: [],
    })
    return true
  } catch (error) {
    console.error("Error creating user profile:", error)
    throw error
  }
}

// Get user profile from Firestore
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() }
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting user profile:", error)
    throw error
  }
}

// Update user profile
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

// Register new user with Firebase
export const registerUser = async (email, password, firstName, lastName, studentId = "") => {
  try {
    // Create Firebase auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update display name
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`,
    })

    // Create user profile in Firestore
    await createUserProfile(user.uid, {
      email,
      firstName,
      lastName,
      studentId,
    })

    return {
      success: true,
      user: {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        firstName,
        lastName,
        studentId,
      },
    }
  } catch (error) {
    console.error("Registration error:", error)
    let message = "Registration failed. Please try again."

    if (error.code === "auth/email-already-in-use") {
      message = "Email already registered"
    } else if (error.code === "auth/weak-password") {
      message = "Password must be at least 6 characters"
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email format"
    }

    return {
      success: false,
      message,
    }
  }
}

// Login user with Firebase
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Get user profile from Firestore
    const profile = await getUserProfile(user.uid)

    // Update last login
    await updateUserProfile(user.uid, {
      lastLogin: serverTimestamp(),
    })

    return {
      success: true,
      user: {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        ...profile,
      },
    }
  } catch (error) {
    console.error("Login error:", error)
    let message = "Invalid email or password"

    if (error.code === "auth/user-not-found") {
      message = "No account found with this email"
    } else if (error.code === "auth/wrong-password") {
      message = "Invalid email or password"
    } else if (error.code === "auth/too-many-requests") {
      message = "Too many failed attempts. Please try again later."
    }

    return {
      success: false,
      message,
    }
  }
}

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth)
    return { success: true }
  } catch (error) {
    console.error("Logout error:", error)
    return {
      success: false,
      message: "Logout failed. Please try again.",
    }
  }
}

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email)
    return {
      success: true,
      message: "Password reset email sent",
    }
  } catch (error) {
    console.error("Password reset error:", error)
    return {
      success: false,
      message: "Failed to send password reset email",
    }
  }
}

// Auth state observer
export const observeAuthState = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await getUserProfile(user.uid)
      callback({
        authenticated: true,
        user: {
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
          ...profile,
        },
      })
    } else {
      callback({
        authenticated: false,
        user: null,
      })
    }
  })
}

// Check if user is authenticated
export const isAuthenticated = () => {
  return auth.currentUser !== null
}

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser
}

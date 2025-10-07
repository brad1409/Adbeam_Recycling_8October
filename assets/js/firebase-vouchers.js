import { db } from "./firebaseConfig.js";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/**
 * Voucher System with Firebase
 */

// Get all available voucher templates
export async function getVoucherTemplates() {
  try {
    const q = query(collection(db, "voucherTemplates"), where("isActive", "==", true), orderBy("pointsCost", "asc"))

    const snapshot = await getDocs(q)
    const templates = []

    snapshot.forEach((doc) => {
      templates.push({
        templateId: doc.id,
        ...doc.data(),
      })
    })

    return templates
  } catch (error) {
    console.error("Error fetching voucher templates:", error)
    throw error
  }
}

// Generate a voucher for a user
export async function generateVoucher(userId, templateId) {
  try {
    // Get template details
    const templateRef = doc(db, "voucherTemplates", templateId)
    const templateSnap = await getDoc(templateRef)

    if (!templateSnap.exists()) {
      throw new Error("Voucher template not found")
    }

    const template = templateSnap.data()

    // Get user data
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      throw new Error("User not found")
    }

    const userData = userSnap.data()

    // Check if user has enough points
    if (userData.pointsBalance < template.pointsCost) {
      throw new Error("Insufficient points")
    }

    // Check inventory if applicable
    if (template.inventory !== null && template.inventory <= 0) {
      throw new Error("Voucher out of stock")
    }

    // Generate voucher code
    const voucherCode = generateVoucherCode()

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (template.validDays || 30))

    // Create voucher document
    const voucherData = {
      userId,
      templateId,
      templateName: template.name,
      voucherCode,
      status: "active",
      discountType: template.discountType,
      discountValue: template.discountValue,
      vendorName: template.vendorName,
      category: template.category,
      termsConditions: template.termsConditions,
      qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${voucherCode}`,
      generatedAt: serverTimestamp(),
      expiresAt: expiresAt,
      redeemedAt: null,
      pointsCost: template.pointsCost,
    }

    const voucherRef = await addDoc(collection(db, "vouchers"), voucherData)

    // Deduct points from user
    await updateDoc(userRef, {
      pointsBalance: userData.pointsBalance - template.pointsCost,
      totalPointsSpent: (userData.totalPointsSpent || 0) + template.pointsCost,
    })

    // Update template inventory if applicable
    if (template.inventory !== null) {
      await updateDoc(templateRef, {
        inventory: template.inventory - 1,
      })
    }

    // Record transaction
    await addDoc(collection(db, "transactions"), {
      userId,
      type: "voucher_purchase",
      amount: -template.pointsCost,
      description: `Generated voucher: ${template.name}`,
      voucherId: voucherRef.id,
      timestamp: serverTimestamp(),
    })

    return {
      voucherId: voucherRef.id,
      voucherCode,
      ...voucherData,
    }
  } catch (error) {
    console.error("Error generating voucher:", error)
    throw error
  }
}

// Get user's vouchers
export async function getUserVouchers(userId, statusFilter = "all") {
  try {
    const q = query(collection(db, "vouchers"), where("userId", "==", userId), orderBy("generatedAt", "desc"))

    const snapshot = await getDocs(q)
    const vouchers = []
    const now = new Date()

    snapshot.forEach((doc) => {
      const data = doc.data()

      // Check if voucher is expired
      let status = data.status
      if (status === "active" && data.expiresAt && data.expiresAt.toDate() < now) {
        status = "expired"
      }

      // Apply status filter
      if (statusFilter === "all" || status === statusFilter) {
        const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null
        const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0

        vouchers.push({
          voucherId: doc.id,
          ...data,
          status,
          expiresAt,
          daysUntilExpiry,
          generatedAt: data.generatedAt ? data.generatedAt.toDate() : null,
          redeemedAt: data.redeemedAt ? data.redeemedAt.toDate() : null,
        })
      }
    })

    return vouchers
  } catch (error) {
    console.error("Error fetching user vouchers:", error)
    throw error
  }
}

// Redeem a voucher
export async function redeemVoucher(voucherId, vendorId) {
  try {
    const voucherRef = doc(db, "vouchers", voucherId)
    const voucherSnap = await getDoc(voucherRef)

    if (!voucherSnap.exists()) {
      throw new Error("Voucher not found")
    }

    const voucher = voucherSnap.data()

    // Check if voucher is already redeemed
    if (voucher.status === "redeemed") {
      throw new Error("Voucher already redeemed")
    }

    // Check if voucher is expired
    if (voucher.expiresAt && voucher.expiresAt.toDate() < new Date()) {
      throw new Error("Voucher expired")
    }

    // Update voucher status
    await updateDoc(voucherRef, {
      status: "redeemed",
      redeemedAt: serverTimestamp(),
      redeemedBy: vendorId,
    })

    // Record redemption transaction
    await addDoc(collection(db, "transactions"), {
      userId: voucher.userId,
      type: "voucher_redemption",
      description: `Redeemed voucher: ${voucher.templateName}`,
      voucherId,
      vendorId,
      timestamp: serverTimestamp(),
    })

    return true
  } catch (error) {
    console.error("Error redeeming voucher:", error)
    throw error
  }
}

// Verify voucher code
export async function verifyVoucherCode(voucherCode) {
  try {
    const q = query(collection(db, "vouchers"), where("voucherCode", "==", voucherCode))

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { valid: false, message: "Voucher not found" }
    }

    const voucherDoc = snapshot.docs[0]
    const voucher = voucherDoc.data()

    // Check status
    if (voucher.status === "redeemed") {
      return { valid: false, message: "Voucher already redeemed" }
    }

    // Check expiry
    if (voucher.expiresAt && voucher.expiresAt.toDate() < new Date()) {
      return { valid: false, message: "Voucher expired" }
    }

    return {
      valid: true,
      voucherId: voucherDoc.id,
      voucher: {
        ...voucher,
        expiresAt: voucher.expiresAt ? voucher.expiresAt.toDate() : null,
        generatedAt: voucher.generatedAt ? voucher.generatedAt.toDate() : null,
      },
    }
  } catch (error) {
    console.error("Error verifying voucher:", error)
    return { valid: false, message: "Verification error" }
  }
}

// Helper function to generate unique voucher code
function generateVoucherCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Get voucher categories
export async function getVoucherCategories() {
  try {
    const snapshot = await getDocs(collection(db, "voucherTemplates"))
    const categories = new Set()

    snapshot.forEach((doc) => {
      const data = doc.data()
      if (data.category) {
        categories.add(data.category)
      }
    })

    return Array.from(categories)
  } catch (error) {
    console.error("Error fetching voucher categories:", error)
    return []
  }
}

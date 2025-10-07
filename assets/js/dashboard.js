import { Chart } from "@/components/ui/chart"
import { observeAuthState, getCurrentUser, logoutUser } from "./firebase-auth.js"
import { getUserStats, getUserRecyclingHistory } from "./firebase-data.js"

// Dashboard functionality with Firebase integration
class Dashboard {
  constructor() {
    this.user = null
    this.charts = {}
    this.init()
  }

  async init() {
    await this.checkAuth()
    await this.loadDashboardData()
    this.setupEventListeners()
    this.startPeriodicUpdates()
  }

  async checkAuth() {
    return new Promise((resolve) => {
      observeAuthState((authState) => {
        if (!authState.authenticated) {
          window.location.href = "/assets/index.html"
          return
        }

        this.user = authState.user
        this.updateUserInfo()
        resolve()
      })
    })
  }

  async loadDashboardData() {
    try {
      console.log("Loading dashboard data from Firebase...")

      const currentUser = getCurrentUser()
      if (!currentUser) {
        console.error("No authenticated user")
        return
      }

      // Load stats and activity from Firebase
      const [statsResult, activityResult] = await Promise.all([
        getUserStats(currentUser.uid),
        getUserRecyclingHistory(currentUser.uid, 50),
      ])

      console.log("Firebase stats:", statsResult)
      console.log("Firebase activity:", activityResult)

      if (statsResult.success) {
        this.updateDashboard(statsResult.stats)
      } else {
        console.error("Failed to load stats:", statsResult.message)
        this.showError("Failed to load user statistics")
      }

      if (activityResult.success) {
        this.updateRecentActivity(activityResult.activities)
      } else {
        console.error("Failed to load activity:", activityResult.message)
        this.showError("Failed to load user activity")
      }

      await this.loadRewardsPreview()
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      this.showError("Failed to load dashboard data: " + error.message)
    }
  }

  updateDashboard(stats) {
    console.log("Updating dashboard with Firebase stats:", stats)

    // Update stats cards with Firebase data
    const statElements = {
      totalPoints: stats.totalPointsEarned || 0,
      totalItems: stats.totalItemsRecycled || 0,
      co2Saved: `${(stats.co2Saved || 0).toFixed(1)} kg`,
    }

    Object.entries(statElements).forEach(([id, value]) => {
      const element = document.getElementById(id)
      if (element) {
        element.textContent = value
        element.classList.add("pulse-animation")
        setTimeout(() => element.classList.remove("pulse-animation"), 600)
      }
    })

    // Update trends
    this.updateTrends(stats)

    // Calculate and update rank
    const rank = this.calculateRank(stats.totalPointsEarned || 0)
    const rankElement = document.getElementById("campusRank")
    if (rankElement) {
      rankElement.textContent = `#${rank}`
    }
  }

  updateUserInfo() {
    if (!this.user) return

    const userNameElement = document.getElementById("userName")
    if (userNameElement) {
      userNameElement.textContent = this.user.displayName || this.user.firstName || "Student"
    }

    const elements = {
      "user-name": this.user.displayName || this.user.firstName || "User",
      "user-email": this.user.email || "",
      "user-points": this.user.pointsBalance || 0,
    }

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id)
      if (element) element.textContent = value
    })
  }

  updateTrends(stats) {
    const pointsIncrease = Math.min(Math.floor((stats.totalPointsEarned || 0) * 0.15), 100)
    const itemsIncrease = Math.min(stats.totalItemsRecycled || 0, 20)

    const pointsTrendElement = document.getElementById("points-trend")
    if (pointsTrendElement) {
      pointsTrendElement.textContent = `+${pointsIncrease}% this week`
    }

    const itemsTrendElement = document.getElementById("items-trend")
    if (itemsTrendElement) {
      itemsTrendElement.textContent = `+${itemsIncrease} this week`
    }
  }

  calculateRank(points) {
    if (points >= 1000) return Math.floor(Math.random() * 10) + 1
    if (points >= 500) return Math.floor(Math.random() * 20) + 10
    if (points >= 100) return Math.floor(Math.random() * 50) + 20
    return Math.floor(Math.random() * 100) + 50
  }

  updateStatsCards(data) {
    const statElements = {
      "points-balance": data.points?.balance || 0,
      "total-points-earned": data.points?.total_earned || 0,
      "total-activities": data.activities?.total || 0,
      "activities-today": data.activities?.today || 0,
      "activities-this-week": data.activities?.this_week || 0,
      "activities-this-month": data.activities?.this_month || 0,
      "total-redemptions": data.redemptions?.total || 0,
      "points-spent": data.redemptions?.points_spent || 0,
      "co2-saved": `${data.environmental_impact?.total_co2_saved || 0} kg`,
      "current-level": data.level?.current_level || 1,
      "level-name": data.level?.level_name || "Eco Newbie",
      "user-rank": `#${data.ranking?.position || "N/A"}`,
      "total-users": data.ranking?.total_users || 0,
    }

    Object.entries(statElements).forEach(([id, value]) => {
      const element = document.getElementById(id)
      if (element) {
        element.textContent = value
        element.classList.add("stat-updated")
        setTimeout(() => element.classList.remove("stat-updated"), 1000)
      }
    })
  }

  updateLevelProgress(levelData) {
    const progressBar = document.getElementById("level-progress")
    if (progressBar) {
      progressBar.style.width = `${levelData.progress_percentage}%`
      progressBar.setAttribute("aria-valuenow", levelData.progress_percentage)
    }

    const progressText = document.getElementById("level-progress-text")
    if (progressText) {
      progressText.textContent = `${levelData.points_in_level}/${levelData.points_in_level + levelData.points_to_next} points`
    }

    const nextLevelInfo = document.getElementById("next-level-info")
    if (nextLevelInfo) {
      nextLevelInfo.textContent = `${levelData.points_to_next} points to level ${levelData.current_level + 1}`
    }
  }

  updateEnvironmentalImpact(impactData) {
    const co2Element = document.getElementById("total-co2-saved")
    if (co2Element) {
      co2Element.textContent = `${impactData.total_co2_saved} kg`
    }

    const impactChart = document.getElementById("environmental-impact-chart")
    if (impactChart && impactData.total_co2_saved > 0) {
      this.createEnvironmentalImpactChart(impactData)
    }
  }

  updateRanking(rankingData) {
    const rankElement = document.getElementById("user-ranking")
    if (rankElement) {
      rankElement.innerHTML = `
        <div class="ranking-info">
          <span class="rank-position">#${rankingData.position}</span>
          <span class="rank-total">of ${rankingData.total_users} users</span>
        </div>
      `
    }
  }

  updateMaterialBreakdown(materials) {
    const container = document.getElementById("material-breakdown")
    if (!container || !materials.length) return

    container.innerHTML = materials
      .map(
        (material) => `
      <div class="material-item">
        <div class="material-icon">
          <i class="bi bi-${this.getMaterialIcon(material.material_type)}"></i>
        </div>
        <div class="material-info">
          <div class="material-name">${material.material_type}</div>
          <div class="material-stats">
            <span class="count">${material.count} items</span>
            <span class="points">${material.points} points</span>
            <span class="co2">${material.co2_saved} kg CO₂</span>
          </div>
        </div>
      </div>
    `,
      )
      .join("")
  }

  updateAchievements(achievements) {
    const container = document.getElementById("achievements-list")
    if (!container) return

    if (achievements.length === 0) {
      container.innerHTML = '<div class="no-achievements">No achievements yet. Keep recycling!</div>'
      return
    }

    container.innerHTML = achievements
      .map(
        (achievement) => `
      <div class="achievement-item">
        <div class="achievement-icon">
          <i class="bi bi-trophy"></i>
        </div>
        <div class="achievement-content">
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-description">${achievement.description}</div>
        </div>
      </div>
    `,
      )
      .join("")
  }

  updateRecentActivity(activities) {
    const activityList = document.getElementById("activity-list")
    if (!activityList) return

    if (!activities || activities.length === 0) {
      activityList.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="activity-content">
            <h4>Welcome to Adbeam!</h4>
            <p>Start scanning items to see your activity here</p>
          </div>
          <div class="activity-points">--</div>
        </div>
      `
      return
    }

    activityList.innerHTML = activities
      .slice(0, 10)
      .map((activity) => {
        const date = activity.timestamp?.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp)
        const timeAgo = this.getTimeAgo(date)
        const materialIcon = this.getMaterialIcon(activity.material)

        return `
          <div class="activity-item">
            <div class="activity-icon">
              <i class="fas fa-${materialIcon}"></i>
            </div>
            <div class="activity-content">
              <h4>${activity.material.charAt(0).toUpperCase() + activity.material.slice(1)} Recycled</h4>
              <p>${timeAgo} • ${activity.location || "Unknown location"}</p>
            </div>
            <div class="activity-points">+${activity.points} pts</div>
          </div>
        `
      })
      .join("")
  }

  updateCharts(chartData) {
    if (chartData.activity && document.getElementById("activity-chart")) {
      this.createActivityChart(chartData.activity)
    }

    if (chartData.materials && document.getElementById("materials-chart")) {
      this.createMaterialsChart(chartData.materials)
    }
  }

  createActivityChart(data) {
    const ctx = document.getElementById("activity-chart")
    if (!ctx) return

    if (this.charts.activity) {
      this.charts.activity.destroy()
    }

    this.charts.activity = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: "Points Earned",
            data: data.data || [],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    })
  }

  createMaterialsChart(data) {
    const ctx = document.getElementById("materials-chart")
    if (!ctx) return

    if (this.charts.materials) {
      this.charts.materials.destroy()
    }

    this.charts.materials = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: data.labels || [],
        datasets: [
          {
            data: data.data || [],
            backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    })
  }

  async loadRewardsPreview() {
    try {
      const response = await fetch("/api/rewards/list.php", { credentials: "include" })
      const data = await response.json()

      if (data.success) {
        const availableRewards = data.data.filter((reward) => reward.is_active && reward.can_redeem).slice(0, 3)

        const rewardsPreview = document.getElementById("rewards-preview")
        if (rewardsPreview) {
          if (availableRewards.length === 0) {
            rewardsPreview.innerHTML = '<div class="no-rewards">No rewards available</div>'
            return
          }

          rewardsPreview.innerHTML = availableRewards
            .map(
              (reward) => `
                <div class="reward-item">
                  <div class="reward-image">
                    ${
                      reward.image_url
                        ? `<img src="${reward.image_url}" alt="${reward.name}">`
                        : '<i class="bi bi-gift"></i>'
                    }
                  </div>
                  <div class="reward-content">
                    <div class="reward-name">${reward.name}</div>
                    <div class="reward-points">${reward.points_cost} points</div>
                    <div class="reward-status">
                      ${
                        reward.points_cost <= (this.user?.pointsBalance || 0)
                          ? '<span class="available">Available</span>'
                          : `<span class="need-more">Need ${reward.points_cost - (this.user?.pointsBalance || 0)} more</span>`
                      }
                    </div>
                  </div>
                </div>
              `,
            )
            .join("")
        }
      }
    } catch (error) {
      console.error("Failed to load rewards preview:", error)
    }
  }

  setupEventListeners() {
    const refreshBtn = document.getElementById("refresh-dashboard")
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.loadDashboardData())
    }

    const quickScanBtn = document.getElementById("quick-scan")
    if (quickScanBtn) {
      quickScanBtn.addEventListener("click", () => {
        window.location.href = "/assets/qr-scanner.html"
      })
    }

    const viewRewardsBtn = document.getElementById("view-rewards")
    if (viewRewardsBtn) {
      viewRewardsBtn.addEventListener("click", () => {
        window.location.href = "/assets/rewards.html"
      })
    }

    const viewLeaderboardBtn = document.getElementById("view-leaderboard")
    if (viewLeaderboardBtn) {
      viewLeaderboardBtn.addEventListener("click", () => {
        window.location.href = "/assets/leaderboard.html"
      })
    }

    const logoutBtn = document.getElementById("signoutButton")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        const result = await logoutUser()
        if (result.success) {
          window.location.href = "/assets/index.html"
        }
      })
    }
  }

  startPeriodicUpdates() {
    setInterval(
      () => {
        this.loadDashboardData()
      },
      5 * 60 * 1000,
    )
  }

  getMaterialIcon(materialType) {
    const icons = {
      plastic: "wine-bottle",
      glass: "wine-glass",
      aluminum: "beer",
      paper: "newspaper",
      cardboard: "box",
    }
    return icons[materialType?.toLowerCase()] || "recycle"
  }

  getTimeAgo(date) {
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return date.toLocaleDateString()
  }

  showError(message) {
    const alertContainer = document.getElementById("alert-container")
    if (alertContainer) {
      const alert = document.createElement("div")
      alert.className = "alert alert-danger alert-dismissible fade show"
      alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `
      alertContainer.appendChild(alert)

      setTimeout(() => {
        if (alert.parentNode) {
          alert.remove()
        }
      }, 5000)
    }
  }

  showSuccess(message) {
    const alertContainer = document.getElementById("alert-container")
    if (alertContainer) {
      const alert = document.createElement("div")
      alert.className = "alert alert-success alert-dismissible fade show"
      alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `
      alertContainer.appendChild(alert)

      setTimeout(() => {
        if (alert.parentNode) {
          alert.remove()
        }
      }, 5000)
    }
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new Dashboard()
})

// Legacy functions for backward compatibility
async function loadDashboardData() {
  // Kept for backward compatibility
}

async function loadRewardsPreview() {
  // Kept for backward compatibility
}

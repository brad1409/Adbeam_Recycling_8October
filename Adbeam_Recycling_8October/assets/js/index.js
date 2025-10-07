import { registerUser, loginUser } from "./js/firebase-auth.js"

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm")
  const registerForm = document.getElementById("registerForm")
  const alertContainer = document.getElementById("alertContainer")

  function showAlert(message, type = "danger") {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `
  }

  function clearAlerts() {
    alertContainer.innerHTML = ""
  }

  // Form switching
  window.switchForm = (formType) => {
    if (!loginForm || !registerForm) return

    if (formType === "register") {
      loginForm.classList.remove("active")
      registerForm.classList.add("active")
    } else {
      registerForm.classList.remove("active")
      loginForm.classList.add("active")
    }

    clearAlerts()
  }

  // Password validation
  function validatePasswords() {
    const password = document.getElementById("registerPassword").value
    const confirm = document.getElementById("confirmPassword").value
    if (password !== confirm) {
      showAlert("Passwords do not match")
      return false
    }
    return true
  }

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault()
    clearAlerts()

    const email = document.getElementById("loginEmail").value.trim()
    const password = document.getElementById("loginPassword").value.trim()

    if (!email || !password) {
      showAlert("Please fill in all fields")
      return
    }

    const btn = e.target.querySelector('button[type="submit"]')
    btn.disabled = true
    btn.classList.add("loading")

    try {
      const result = await loginUser(email, password)

      if (result.success) {
        showAlert("Login successful! Redirecting...", "success")
        setTimeout(() => {
          window.location.href = result.user.isAdmin ? "../api/admin/admin_dashboard.php" : "./dashboard.html"
        }, 1000)
      } else {
        showAlert(result.message || "Login failed")
      }
    } catch (err) {
      console.error("Login error:", err)
      showAlert("Network error. Please try again.")
    } finally {
      btn.disabled = false
      btn.classList.remove("loading")
    }
  })

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault()
    clearAlerts()

    if (!validatePasswords()) return

    const email = document.getElementById("registerEmail").value.trim()
    const password = document.getElementById("registerPassword").value.trim()
    const firstName = document.getElementById("firstName").value.trim()
    const lastName = document.getElementById("lastName").value.trim()
    const studentId = document.getElementById("studentId").value.trim()

    const btn = e.target.querySelector('button[type="submit"]')
    btn.disabled = true
    btn.classList.add("loading")

    try {
      const result = await registerUser(email, password, firstName, lastName, studentId)

      if (result.success) {
        showAlert("Registration successful! Redirecting...", "success")
        setTimeout(() => {
          window.location.href = "./dashboard.html"
        }, 1000)
      } else {
        showAlert(result.message || "Registration failed")
      }
    } catch (err) {
      console.error("Registration error:", err)
      showAlert("Registration failed. Please try again.")
    } finally {
      btn.disabled = false
      btn.classList.remove("loading")
    }
  })
})

const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const { issueCsrfToken } = require("../middleware/csrfMiddleware");

const {
  startGitHubLogin,
  handleGitHubCallback,
  cliGitHubCallback,
  refreshTokens,
  logout,
  getMe,
  devLogin
} = require("../controllers/authController");

const router = express.Router();

router.get("/github", startGitHubLogin);
router.get("/github/callback", handleGitHubCallback);
router.post("/github/cli/callback", cliGitHubCallback);

router.post("/refresh", refreshTokens);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);

router.get("/csrf-token", issueCsrfToken);

// development only
router.post("/dev-login", devLogin);

module.exports = router;
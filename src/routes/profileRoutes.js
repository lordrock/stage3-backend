const express = require("express");

const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const requireApiVersion = require("../middleware/apiVersionMiddleware");
const { apiRateLimiter } = require("../middleware/rateLimitMiddleware");

const {
  getProfiles,
  searchProfiles,
  exportProfiles,
  createProfile,
  getProfileById,
  deleteProfile
} = require("../controllers/profileController");

const router = express.Router();

router.use(requireAuth);
router.use(apiRateLimiter);
router.use(requireApiVersion);

router.get("/", requireRole("admin", "analyst"), getProfiles);
router.get("/search", requireRole("admin", "analyst"), searchProfiles);
router.get("/export", requireRole("admin", "analyst"), exportProfiles);
router.post("/", requireRole("admin"), createProfile);
router.get("/:id", requireRole("admin", "analyst"), getProfileById);

module.exports = router;
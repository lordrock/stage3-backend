const express = require("express");
const multer = require("multer");

const requireAuth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const requireApiVersion = require("../middleware/apiVersionMiddleware");

const { uploadProfilesCsv } = require("../controllers/ingestionController");

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 1024 * 1024 * 200
  }
});

const router = express.Router();

router.use(requireAuth);
router.use(requireApiVersion);

router.post(
  "/profiles/csv",
  requireRole("admin"),
  upload.single("file"),
  uploadProfilesCsv
);

module.exports = router;
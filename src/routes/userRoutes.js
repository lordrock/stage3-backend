const express = require("express");
const requireAuth = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    status: "success",
    data: {
      id: req.user.id,
      github_id: req.user.github_id,
      username: req.user.username,
      email: req.user.email,
      avatar_url: req.user.avatar_url,
      role: req.user.role
    }
  });
});

module.exports = router;
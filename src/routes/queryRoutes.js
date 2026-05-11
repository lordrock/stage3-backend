const express = require("express");

const requireAuth = require("../middleware/authMiddleware");
const requireApiVersion = require("../middleware/apiVersionMiddleware");

const {
  saveQuery,
  getSavedQueries,
  runSavedQuery,
  deleteSavedQuery
} = require("../controllers/queryController");

const router = express.Router();

router.use(requireAuth);
router.use(requireApiVersion);

router.post("/save", saveQuery);

router.get("/", getSavedQueries);

router.post("/:id/run", runSavedQuery);

router.delete("/:id", deleteSavedQuery);

module.exports = router;
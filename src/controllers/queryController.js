const { v7: uuidv7 } = require("uuid");

const SavedQuery = require("../models/SavedQuery");
const Profile = require("../models/Profile");

const saveQuery = async (req, res) => {
  try {
    const { name, filters, favorite } = req.body;

    if (!name || !filters) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields"
      });
    }

    const query = await SavedQuery.create({
      id: uuidv7(),
      user_id: req.user.id,
      name,
      filters,
      favorite: Boolean(favorite)
    });

    return res.status(201).json({
      status: "success",
      data: query
    });
  } catch (error) {
    console.error("Save query error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const getSavedQueries = async (req, res) => {
  try {
    const queries = await SavedQuery.find({
      user_id: req.user.id
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      status: "success",
      data: queries
    });
  } catch (error) {
    console.error("Get queries error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const runSavedQuery = async (req, res) => {
  try {
    const { id } = req.params;

    const query = await SavedQuery.findOne({
      id,
      user_id: req.user.id
    });

    if (!query) {
      return res.status(404).json({
        status: "error",
        message: "Saved query not found"
      });
    }

    query.last_run_at = new Date();
    await query.save();

    const profiles = await Profile.find(query.filters)
      .limit(50)
      .lean();

    return res.status(200).json({
      status: "success",
      query: {
        id: query.id,
        name: query.name
      },
      results: profiles
    });
  } catch (error) {
    console.error("Run query error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const deleteSavedQuery = async (req, res) => {
  try {
    const { id } = req.params;

    const query = await SavedQuery.findOne({
      id,
      user_id: req.user.id
    });

    if (!query) {
      return res.status(404).json({
        status: "error",
        message: "Saved query not found"
      });
    }

    await SavedQuery.deleteOne({ id });

    return res.status(204).send();
  } catch (error) {
    console.error("Delete query error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

module.exports = {
  saveQuery,
  getSavedQueries,
  runSavedQuery,
  deleteSavedQuery
};
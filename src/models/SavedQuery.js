const mongoose = require("mongoose");

const savedQuerySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    user_id: {
      type: String,
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    filters: {
      type: Object,
      required: true
    },

    favorite: {
      type: Boolean,
      default: false
    },

    last_run_at: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("SavedQuery", savedQuerySchema);
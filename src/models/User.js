const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  github_id: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    default: null,
    trim: true
  },
  avatar_url: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ["admin", "analyst"],
    default: "analyst"
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_login_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ role: 1 });
userSchema.index({ is_active: 1 });

const User = mongoose.model("User", userSchema);

module.exports = User;
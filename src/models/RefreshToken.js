const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  token_hash: {
    type: String,
    required: true,
    unique: true
  },
  is_revoked: {
    type: Boolean,
    default: false
  },
  expires_at: {
    type: Date,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  revoked_at: {
    type: Date,
    default: null
  }
});

refreshTokenSchema.index({ expires_at: 1 });
refreshTokenSchema.index({ is_revoked: 1 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;
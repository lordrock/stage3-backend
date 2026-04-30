const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ["male", "female"]
  },
  gender_probability: {
    type: Number,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  age_group: {
    type: String,
    required: true,
    enum: ["child", "teenager", "adult", "senior"]
  },
  country_id: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  country_name: {
    type: String,
    required: true,
    trim: true
  },
  country_probability: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now
  }
});

profileSchema.index({ gender: 1 });
profileSchema.index({ age_group: 1 });
profileSchema.index({ country_id: 1 });
profileSchema.index({ age: 1 });
profileSchema.index({ created_at: 1 });

const Profile = mongoose.model("Profile", profileSchema);

module.exports = Profile;
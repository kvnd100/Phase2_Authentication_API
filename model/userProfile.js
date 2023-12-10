const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema({
  fullName: String,
  passportNumber: String,
  address: String,
  phoneNumber: String,
  profilePicture: String,
});

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

module.exports = UserProfile;

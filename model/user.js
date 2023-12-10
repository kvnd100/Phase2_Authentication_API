const mongoose = require("mongoose");
const userProfileSchema = require("./userProfile");
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  email: String,
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserProfile",
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;

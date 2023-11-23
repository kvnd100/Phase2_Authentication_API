const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  email: String,
});

const User = mongoose.model("User", userSchema);

module.exports = User;

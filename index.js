const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const User = require("./model/user");

app.use(bodyParser.json());
app.use(cors());

const secretKey = "secret_key";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "email",
    pass: "password",
  },
});

const PORT = 3000;
//authenticate middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.sendStatus(404);
  }

  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(404);
    }

    req.user = user;
    next();
  });
};

//send password reset email
const sendPasswordResetEmail = (email, resetLink) => {
  const mailOptions = {
    from: "kvndranasinghe@gmail.com",
    to: email,
    subject: "Password Reset",
    html: `<p>Click the following link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error("Error sending password reset email:", error);
    }
    console.log("Password reset email sent:", info.response);
  });
};
//connect to mongodb
mongoose.connect(
  `mongodb+srv://kvndranasinghe:iizpkm0wquJhbLR7@cluster0.idfauik.mongodb.net/airlines?retryWrites=true&w=majority`
);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, secretKey);
    const userEmail = decoded.email;

    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.sendStatus(404);
    }

    user.password = newPassword;
    await user.save();

    res.sendStatus(200);
  } catch (error) {
    console.error("Error during password reset:", error);
    res.sendStatus(401);
  }
});

//login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password });

    if (!user) {
      return res.sendStatus(404);
    }

    const accessToken = jwt.sign(
      { username: user.username, id: user.id, role: user.role },
      secretKey
    );

    res.json({ user: { id: user.id, username: user.username, role: user.role }, accessToken });
  } catch (error) {
    console.error("Error during login:", error);
    res.sendStatus(500);
  }
});

//forgot password endpoint
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.sendStatus(404);
    }

    const resetToken = jwt.sign({ email: user.email }, secretKey, { expiresIn: "1h" });

    const resetLink = `http://localhost:4200/reset-password?token=${resetToken}`;

    sendPasswordResetEmail(email, resetLink);

    res.sendStatus(200);
  } catch (error) {
    console.error("Error during forgot password:", error);
    res.sendStatus(500);
  }
});

//get all users endpoint
app.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select("_id username email role");
    const mappedUsers = users.map((user) => ({ id: user._id, ...user.toObject() }));
    res.json(mappedUsers);
  } catch (error) {
    console.error("Error getting users:", error);
    res.sendStatus(500);
  }
});

//update user endpoint
app.put("/users/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    console.log(user);
    if (!user) {
      return res.sendStatus(404);
    }

    Object.assign(user, req.body);

    await user.save();

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.sendStatus(500);
  }
});

//delte user endpoint
app.delete("/users/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.sendStatus(404);
    }

    res.sendStatus(204);
  } catch (error) {
    console.error("Error deleting user:", error);
    res.sendStatus(500);
  }
});

// create user endpoint
app.post("/register", async (req, res) => {
  const { username, password, role, email } = req.body;
  const validRoles = ["admin", "terminal agent", "passenger"];

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email is already taken." });
    }
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ error: "Invalid role." });
    }
    const newUser = new User({ username, password, role, email });
    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//get user by id
app.get("/users/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId).select("_id username email role");

    if (!user) {
      return res.sendStatus(404);
    }

    res.json({ id: user._id, ...user.toObject() });
  } catch (error) {
    console.error("Error getting user by ID:", error);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

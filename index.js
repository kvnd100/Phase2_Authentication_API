const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const User = require("./model/user");
require("dotenv").config();
const bcrypt = require("bcrypt");

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
      console.log(err);
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
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.idfauik.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
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
    const user = await User.findOne({ username });

    if (!user) {
      return res.sendStatus(404);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.sendStatus(401);
    }

    const accessToken = jwt.sign(
      { username: user.username, id: user.id, role: user.role, email: user.email },
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
app.post("/register", authenticateToken, async (req, res) => {
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
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, password: hashedPassword, role, email });
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

app.get("/get-user-details", authenticateToken, (req, res) => {
  const userDetails = req.user;
  res.json(userDetails);
});

//get statistics data

app.get("/statistics", authenticateToken, (req, res) => {
  const requestedYear = parseInt(req.query.year) || new Date().getFullYear();
  const availableYears = [2023, 2022];
  if (!availableYears.includes(requestedYear)) {
    return res.status(404).json({ error: "Data not available for the requested year." });
  }
  const financialReportData = {
    2023: [100000, 150000, 200000, 180000, 250000],
    2022: [90000, 140000, 190000, 170000, 240000],
  };
  const passengerStatisticsData = {
    2023: [500, 800, 1200, 1000, 1500],
    2022: [450, 750, 1100, 900, 1400],
  };
  const operationalPerformanceData = {
    2023: [90, 85, 92, 88, 94],
    2022: [88, 82, 90, 85, 91],
  };

  res.json({
    chartData: {
      financialReportData: financialReportData[requestedYear],
      passengerStatisticsData: passengerStatisticsData[requestedYear],
      operationalPerformanceData: operationalPerformanceData[requestedYear],
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

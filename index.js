const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const nodemailer = require("nodemailer");

app.use(bodyParser.json());
app.use(cors());

const secretKey = "secret_key";
const users = [
  {
    id: 1,
    username: "kavindu",
    password: "password",
    role: "Admin",
    email: "kvndranasinghe@gmail.com",
  },
  { id: 2, username: "test", password: "test", role: "Passenger", email: "test@example.com" },
  {
    id: 3,
    username: "test2",
    password: "test2",
    role: "Terminal Agent",
    email: "roy123harrper@gmail.com",
  },
];
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

app.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.sendStatus(401);
    }

    const userEmail = decoded.email;

    const user = users.find((u) => u.email === userEmail);

    if (!user) {
      return res.sendStatus(404);
    }

    user.password = newPassword;

    res.sendStatus(200);
  });
});

//login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.sendStatus(404);
  }

  const accessToken = jwt.sign(
    { username: user.username, id: user.id, role: user.role },
    secretKey
  );
  res.json({ user: { id: user.id, username: user.username, role: user.role }, accessToken });
});

//forgot password endpoint
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.sendStatus(404);
  }

  const resetToken = jwt.sign({ email: user.email }, secretKey, { expiresIn: "1h" });

  const resetLink = `http://localhost:4200/reset-password?token=${resetToken}`;

  sendPasswordResetEmail(email, resetLink);

  res.sendStatus(200);
});

//get all users endpoint
app.get("/users", authenticateToken, (req, res) => {
  console.log("test");
  res.json(users);
});

//update user endpoint
app.put("/users/:id", authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.sendStatus(404);
  }

  users[userIndex] = {
    ...users[userIndex],
    ...req.body,
  };

  res.json(users[userIndex]);
});

//delte user endpoint
app.delete("/users/:id", authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);
  users = users.filter((u) => u.id !== userId);
  res.sendStatus(204);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

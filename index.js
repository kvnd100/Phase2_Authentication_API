const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const app = express();
app.use(bodyParser.json());

const secretKey = "secret_key";
const users = [
  { id: 1, username: "kavindu", password: "password" },
  { id: 2, username: "test", password: "test" },
];

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
//login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.sendStatus(404);
  }

  const accessToken = jwt.sign({ username: user.username, id: user.id }, secretKey);
  res.json({ user: { id: user.id, username: user.username }, accessToken });
});

//create new user endpoint
app.post("/users", authenticateToken, (req, res) => {
  const { username, password } = req.body;

  const newUser = {
    id: users.length + 1,
    username,
    password,
  };

  users.push(newUser);
  res.json(newUser);
});

//get all users endpoint
app.get("/users", authenticateToken, (req, res) => {
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

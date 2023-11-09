const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Welcome to my server!");
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

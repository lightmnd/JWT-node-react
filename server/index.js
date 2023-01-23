import express from "express";
import jwt from "jsonwebtoken";
const app = express();
import dotenv from "dotenv";
dotenv.config();

import cors from 'cors'

app.use(express.json());
app.use(cors())

const users = [
  {
    id: 1,
    username: "Rob",
    password: "zzz",
    // isAdmin: true,
    roles: ["admin", "editor", "analyst"],
  },
  {
    id: 2,
    username: "Max",
    password: "xxx",
    //isAdmin: false,
    roles: ["advertiser", "analyst"],
  },
];

let newUsers = [];
let refreshTokens = [];

function generateAccessToken(user) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, userRoles: user.roles },
    process.env.SECRET_KEY_PRIMARY,
    { expiresIn: "15m" }
  );
  return accessToken;
}

function generateRefreshToken(user) {
  const refreshToken = jwt.sign(
    { id: user.id, username: user.username, userRoles: user.roles },
    process.env.SECRET_KEY_REFRESH,
    { expiresIn: "15m" }
  );
  return refreshToken;
}

app.get("/api/users", (req, res) => {
  res.status(200).json(users);
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    // if user, generate an access token with JWT
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.push(refreshToken);
    res.json({
      username: user.username,
      // isAdmin: user.isAdmin,
      userRoles: user.roles,
      accessToken,
      refreshToken,
    });
  } else {
    res.status(400).json("Incorrect username or password.");
  }
});

app.post("/api/refresh", (req, res) => {
  // take the refresh token from the user
  const refreshToken = req.body.token;

  if (!refreshToken) return res.status(401).json("Not Authorized.");

  // send error is there is no token or it is invalid
  if (!refreshTokens.includes(refreshToken))
    res.status(403).json("Refresh token is not valid");

  // if everything is ok, create a access token, refresh token and save to user
  jwt.verify(refreshToken, process.env.SECRET_KEY_REFRESH, (err, user) => {
    if (err) {
      res.status(403).json("Token is not valid");
    }
    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.push(refreshToken);
    refreshTokens.push(newRefreshToken);
    refreshTokens.push(newAccessToken);
    res
      .status(200)
      .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  });
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.SECRET_KEY_PRIMARY, (err, user) => {
      if (err) {
        res.status(403).json("Token is not valid");
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json("You are not authenticated.");
  }
};

app.delete("/api/users/:userId", verifyToken, (req, res, next) => {
  if (req.user.id === req.params.userId || req.user.userRoles) {
    newUsers = users.filter((user) => user.id !== req.user.id);
    res.status(200).json({ message: "User deleted successfully.", newUsers });
  } else {
    res.sendStatus(403).json("Not authorized to delete users.");
  }
});

app.post("/api/logout", verifyToken, (req, res) => {
  const refreshToken  = req.body.token
  refreshTokens = refreshTokens.filter(token => token !== refreshToken)
  res.status(200).json("You are logged out successfully.")
})

app.listen(5000, () => {
  console.log("listening on port 5000");
});

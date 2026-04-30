const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const requestLogger = require("./middleware/requestLogger");
const { authRateLimiter } = require("./middleware/rateLimitMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(
  cors({
    origin: process.env.WEB_CLIENT_URL || "*",
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

app.get("/", (req, res) => {
  res.send("Insighta Labs+ Backend is running");
});

app.use("/auth", authRateLimiter, authRoutes);
app.use("/api/profiles", profileRoutes);

app.use((req, res) => {
  return res.status(404).json({
    status: "error",
    message: "Route not found"
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error.message);

  return res.status(500).json({
    status: "error",
    message: "Internal server error"
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
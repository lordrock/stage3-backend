const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findOne({ id: decoded.sub });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid authentication token"
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "User account is inactive"
      });
    }

    req.user = {
      id: user.id,
      github_id: user.github_id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired authentication token"
    });
  }
};

module.exports = requireAuth;
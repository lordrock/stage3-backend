const crypto = require("crypto");
const { v7: uuidv7 } = require("uuid");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookieHelpers");

const {
  buildGitHubAuthUrl,
  exchangeCodeForGitHubToken,
  fetchGitHubUser,
  fetchGitHubPrimaryEmail
} = require("../services/githubOAuthService");

const {
  issueTokenPair,
  verifyRefreshTokenJwt,
  findValidRefreshTokenRecord,
  revokeRefreshTokenRecord
} = require("../services/tokenService");

const pkceStore = new Map();

const generateCodeVerifier = () => crypto.randomBytes(32).toString("base64url");

const generateCodeChallenge = (codeVerifier) => {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
};

const startGitHubLogin = (req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  pkceStore.set(state, {
    codeVerifier,
    createdAt: Date.now()
  });

  const authUrl = buildGitHubAuthUrl({
    state,
    codeChallenge
  });

  return res.redirect(authUrl);
};

const upsertGithubUser = async (githubAccessToken) => {
  const githubUser = await fetchGitHubUser(githubAccessToken);
  const githubEmail =
    githubUser.email || (await fetchGitHubPrimaryEmail(githubAccessToken));

  let user = await User.findOne({ github_id: String(githubUser.id) });

  if (!user) {
    user = await User.create({
      id: uuidv7(),
      github_id: String(githubUser.id),
      username: githubUser.login,
      email: githubEmail,
      avatar_url: githubUser.avatar_url,
      role: "analyst",
      is_active: true,
      last_login_at: new Date()
    });
  } else {
    user.username = githubUser.login;
    user.email = githubEmail;
    user.avatar_url = githubUser.avatar_url;
    user.last_login_at = new Date();
    await user.save();
  }

  return user;
};

const handleGitHubCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({
        status: "error",
        message: "Missing OAuth callback parameters"
      });
    }

    const pkceData = pkceStore.get(state);

    if (!pkceData) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OAuth state"
      });
    }

    pkceStore.delete(state);

    const githubAccessToken = await exchangeCodeForGitHubToken({
      code,
      codeVerifier: pkceData.codeVerifier
    });

    const user = await upsertGithubUser(githubAccessToken);

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "User account is inactive"
      });
    }

    const tokens = await issueTokenPair(user);

    setAuthCookies(res, tokens);

    return res.redirect(`${process.env.WEB_CLIENT_URL}/auth/success`);
  } catch (error) {
    console.error("GitHub callback error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Authentication failed"
    });
  }
};

const cliGitHubCallback = async (req, res) => {
  try {
    const { code, code_verifier } = req.body;

    if (!code || !code_verifier) {
      return res.status(400).json({
        status: "error",
        message: "Missing OAuth callback parameters"
      });
    }

    const githubAccessToken = await exchangeCodeForGitHubToken({
      code,
      codeVerifier: code_verifier,
      redirectUri:
        process.env.GITHUB_CLI_CALLBACK_URL || "http://localhost:8765/callback"
    });

    const user = await upsertGithubUser(githubAccessToken);

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "User account is inactive"
      });
    }

    const tokens = await issueTokenPair(user);

    return res.status(200).json({
      status: "success",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
  } catch (error) {
    console.error("CLI OAuth callback error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Authentication failed"
    });
  }
};

const refreshTokens = async (req, res) => {
  try {
    const refresh_token = req.body?.refresh_token || req.cookies?.refresh_token;

    if (!refresh_token || typeof refresh_token !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Missing or empty refresh token"
      });
    }

    const decoded = verifyRefreshTokenJwt(refresh_token);
    const user = await User.findOne({ id: decoded.sub });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token"
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "User account is inactive"
      });
    }

    const refreshTokenRecord = await findValidRefreshTokenRecord(
      user.id,
      refresh_token
    );

    if (!refreshTokenRecord) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token"
      });
    }

    await revokeRefreshTokenRecord(refreshTokenRecord);

    const tokens = await issueTokenPair(user);
    setAuthCookies(res, tokens);

    return res.status(200).json({
      status: "success",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired refresh token"
    });
  }
};

const logout = async (req, res) => {
  try {
    const refresh_token = req.body?.refresh_token || req.cookies?.refresh_token;

    if (refresh_token) {
      const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);

      const refreshTokenRecord = await findValidRefreshTokenRecord(
        decoded.sub,
        refresh_token
      );

      if (refreshTokenRecord) {
        await revokeRefreshTokenRecord(refreshTokenRecord);
      }
    }

    clearAuthCookies(res);

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully"
    });
  } catch (error) {
    clearAuthCookies(res);

    return res.status(200).json({
      status: "success",
      message: "Logged out successfully"
    });
  }
};

const getMe = async (req, res) => {
  return res.status(200).json({
    status: "success",
    data: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      avatar_url: req.user.avatar_url,
      role: req.user.role
    }
  });
};

const devLogin = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({
      status: "error",
      message: "Route not found"
    });
  }

  let user = await User.findOne({ username: "dev-admin" });

  if (!user) {
    user = await User.create({
      id: uuidv7(),
      github_id: "dev-admin-github-id",
      username: "dev-admin",
      email: "dev-admin@example.com",
      avatar_url: null,
      role: "admin",
      is_active: true,
      last_login_at: new Date()
    });
  }

  const tokens = await issueTokenPair(user);

  return res.status(200).json({
    status: "success",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });
};

module.exports = {
  startGitHubLogin,
  handleGitHubCallback,
  cliGitHubCallback,
  refreshTokens,
  logout,
  getMe,
  devLogin
};
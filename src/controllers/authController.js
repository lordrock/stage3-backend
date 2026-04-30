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

/* ===========================
   PKCE HELPERS
=========================== */

const generateCodeVerifier = () =>
  crypto.randomBytes(32).toString("base64url");

const generateCodeChallenge = (verifier) =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

/* ===========================
   GITHUB LOGIN (WEB)
=========================== */

const startGitHubLogin = (req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  pkceStore.set(state, { codeVerifier });

  const authUrl = buildGitHubAuthUrl({
    state,
    codeChallenge
  });

  return res.redirect(authUrl);
};

/* ===========================
   UPSERT USER
=========================== */

const upsertGithubUser = async (token) => {
  const githubUser = await fetchGitHubUser(token);
  const email =
    githubUser.email || (await fetchGitHubPrimaryEmail(token));

  let user = await User.findOne({
    github_id: String(githubUser.id)
  });

  if (!user) {
    user = await User.create({
      id: uuidv7(),
      github_id: String(githubUser.id),
      username: githubUser.login,
      email,
      avatar_url: githubUser.avatar_url,
      role: "analyst",
      is_active: true,
      last_login_at: new Date()
    });
  } else {
    user.username = githubUser.login;
    user.email = email;
    user.avatar_url = githubUser.avatar_url;
    user.last_login_at = new Date();
    await user.save();
  }

  return user;
};

/* ===========================
   GITHUB CALLBACK (WEB)
=========================== */

const handleGitHubCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({
        status: "error",
        message: "Missing OAuth params"
      });
    }

    const pkce = pkceStore.get(state);

    if (!pkce) {
      return res.status(400).json({
        status: "error",
        message: "Invalid state"
      });
    }

    pkceStore.delete(state);

    const token = await exchangeCodeForGitHubToken({
      code,
      codeVerifier: pkce.codeVerifier
    });

    const user = await upsertGithubUser(token);

    const tokens = await issueTokenPair(user);

    setAuthCookies(res, tokens);

    return res.redirect(
      `${process.env.WEB_CLIENT_URL}/auth/success`
    );
  } catch (err) {
    console.error("OAuth error:", err.message);

    return res.status(500).json({
      status: "error",
      message: "Authentication failed"
    });
  }
};

/* ===========================
   CLI CALLBACK
=========================== */

const cliGitHubCallback = async (req, res) => {
  try {
    const { code, code_verifier } = req.body;

    if (!code || !code_verifier) {
      return res.status(400).json({
        status: "error",
        message: "Missing parameters"
      });
    }

    const token = await exchangeCodeForGitHubToken({
      code,
      codeVerifier: code_verifier,
      redirectUri: process.env.GITHUB_CLI_CALLBACK_URL
    });

    const user = await upsertGithubUser(token);
    const tokens = await issueTokenPair(user);

    return res.json({
      status: "success",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
  } catch (err) {
    console.error("CLI OAuth error:", err.message);

    return res.status(500).json({
      status: "error",
      message: "Authentication failed"
    });
  }
};

/* ===========================
   REFRESH TOKEN
=========================== */

const refreshTokens = async (req, res) => {
  try {
    const refresh =
      req.body?.refresh_token || req.cookies?.refresh_token;

    if (!refresh) {
      return res.status(400).json({
        status: "error",
        message: "Missing refresh token"
      });
    }

    const decoded = verifyRefreshTokenJwt(refresh);
    const user = await User.findOne({ id: decoded.sub });

    const record = await findValidRefreshTokenRecord(
      user.id,
      refresh
    );

    if (!record) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token"
      });
    }

    await revokeRefreshTokenRecord(record);

    const tokens = await issueTokenPair(user);

    setAuthCookies(res, tokens);

    return res.json({
      status: "success",
      ...tokens
    });
  } catch (err) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired refresh token"
    });
  }
};

/* ===========================
   LOGOUT
=========================== */

const logout = async (req, res) => {
  clearAuthCookies(res);

  return res.json({
    status: "success",
    message: "Logged out"
  });
};

/* ===========================
   GET CURRENT USER
=========================== */

const getMe = (req, res) => {
  return res.json({
    status: "success",
    data: req.user
  });
};

/* ===========================
   DEV LOGIN (IMPORTANT FIX)
=========================== */

const devLogin = async (req, res) => {
  try {
    const role = req.query.role || "admin";

    if (!["admin", "analyst"].includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid role"
      });
    }

    let user = await User.findOne({
      username: `dev-${role}`
    });

    if (!user) {
      user = await User.create({
        id: uuidv7(),
        github_id: `dev-${role}`,
        username: `dev-${role}`,
        email: `${role}@test.com`,
        role,
        is_active: true,
        last_login_at: new Date()
      });
    }

    const tokens = await issueTokenPair(user);

    return res.json({
      status: "success",
      ...tokens
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: "error",
      message: "Dev login failed"
    });
  }
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
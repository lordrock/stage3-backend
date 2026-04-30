const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { v7: uuidv7 } = require("uuid");

const RefreshToken = require("../models/RefreshToken");

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "30m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "2h";

const getRefreshTokenExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);
  return expiresAt;
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      github_id: user.github_id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN
    }
  );
};

const generateRawRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      type: "refresh"
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN
    }
  );
};

const createRefreshTokenRecord = async (user, rawRefreshToken) => {
  const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

  await RefreshToken.create({
    id: uuidv7(),
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: getRefreshTokenExpiryDate()
  });
};

const issueTokenPair = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRawRefreshToken(user);

  await createRefreshTokenRecord(user, refreshToken);

  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
};

const verifyRefreshTokenJwt = (refreshToken) => {
  return jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
};

const findValidRefreshTokenRecord = async (userId, rawRefreshToken) => {
  const records = await RefreshToken.find({
    user_id: userId,
    is_revoked: false,
    expires_at: { $gt: new Date() }
  });

  for (const record of records) {
    const isMatch = await bcrypt.compare(rawRefreshToken, record.token_hash);

    if (isMatch) {
      return record;
    }
  }

  return null;
};

const revokeRefreshTokenRecord = async (record) => {
  record.is_revoked = true;
  record.revoked_at = new Date();
  await record.save();
};

module.exports = {
  issueTokenPair,
  verifyRefreshTokenJwt,
  findValidRefreshTokenRecord,
  revokeRefreshTokenRecord
};
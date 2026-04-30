const Tokens = require("csrf");
const tokens = new Tokens();

const CSRF_SECRET_COOKIE = "csrf_secret";

const issueCsrfToken = (req, res) => {
  let secret = req.cookies?.[CSRF_SECRET_COOKIE];

  if (!secret) {
    secret = tokens.secretSync();

    res.cookie(CSRF_SECRET_COOKIE, secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });
  }

  const token = tokens.create(secret);

  return res.status(200).json({
    status: "success",
    csrf_token: token
  });
};

const requireCsrf = (req, res, next) => {
  const secret = req.cookies?.[CSRF_SECRET_COOKIE];
  const csrfToken = req.headers["x-csrf-token"];

  if (!secret || !csrfToken || !tokens.verify(secret, csrfToken)) {
    return res.status(403).json({
      status: "error",
      message: "Invalid CSRF token"
    });
  }

  next();
};

module.exports = {
  issueCsrfToken,
  requireCsrf
};
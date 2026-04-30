const isProduction = process.env.NODE_ENV === "production";

const setAuthCookies = (res, tokens) => {
  res.cookie("access_token", tokens.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 3 * 60 * 1000
  });

  res.cookie("refresh_token", tokens.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 5 * 60 * 1000
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
};

module.exports = {
  setAuthCookies,
  clearAuthCookies
};
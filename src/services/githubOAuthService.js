const axios = require("axios");

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

const buildGitHubAuthUrl = ({ state, codeChallenge, redirectUri }) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri || process.env.GITHUB_CALLBACK_URL,
    scope: "read:user user:email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
};

const exchangeCodeForGitHubToken = async ({
  code,
  codeVerifier,
  redirectUri
}) => {
  const response = await axios.post(
    GITHUB_TOKEN_URL,
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri || process.env.GITHUB_CALLBACK_URL,
      code_verifier: codeVerifier
    },
    {
      headers: {
        Accept: "application/json"
      }
    }
  );

  if (!response.data.access_token) {
    throw new Error("GitHub token exchange failed");
  }

  return response.data.access_token;
};

const fetchGitHubUser = async (githubAccessToken) => {
  const response = await axios.get(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json"
    }
  });

  return response.data;
};

const fetchGitHubPrimaryEmail = async (githubAccessToken) => {
  const response = await axios.get(GITHUB_EMAILS_URL, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json"
    }
  });

  const primaryEmail = response.data.find(
    (email) => email.primary && email.verified
  );

  return primaryEmail ? primaryEmail.email : null;
};

module.exports = {
  buildGitHubAuthUrl,
  exchangeCodeForGitHubToken,
  fetchGitHubUser,
  fetchGitHubPrimaryEmail
};
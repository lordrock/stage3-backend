const countryMap = {
  nigeria: "NG",
  kenya: "KE",
  angola: "AO",
  benin: "BJ",
  cameroon: "CM",
  ghana: "GH",
  uganda: "UG",
  tanzania: "TZ",
  rwanda: "RW",
  ethiopia: "ET",
  "south africa": "ZA",
  egypt: "EG",
  sudan: "SD",
  "united states": "US",
  usa: "US",
  madagascar: "MG",
  "united kingdom": "GB",
  uk: "GB",
  india: "IN",
  "cape verde": "CV",
  "republic of the congo": "CG",
  congo: "CG",
  mozambique: "MZ",
  mali: "ML",
  zambia: "ZM",
  senegal: "SN",
  namibia: "NA",
  gabon: "GA",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  tunisia: "TN",
  morocco: "MA",
  france: "FR",
  canada: "CA",
  australia: "AU",
  brazil: "BR",
  china: "CN",
  japan: "JP",
  algeria: "DZ"
};

const parseNaturalLanguageQuery = (query) => {
  if (!query || typeof query !== "string" || query.trim() === "") {
    return null;
  }

  const text = query.toLowerCase().trim();
  const filters = {};
  let matchedSomething = false;

  const hasFemale = /\bfemales?\b/.test(text);
  const hasMale = /\bmales?\b/.test(text) && !hasFemale;

  if (hasMale) {
    filters.gender = /^male$/i;
    matchedSomething = true;
  }

  if (hasFemale) {
    filters.gender = /^female$/i;
    matchedSomething = true;
  }

  if (text.includes("male and female") || text.includes("female and male")) {
    delete filters.gender;
    matchedSomething = true;
  }

  if (text.includes("child") || text.includes("children")) {
    filters.age_group = /^child$/i;
    matchedSomething = true;
  }

  if (text.includes("teenager") || text.includes("teenagers")) {
    filters.age_group = /^teenager$/i;
    matchedSomething = true;
  }

  if (text.includes("adult") || text.includes("adults")) {
    filters.age_group = /^adult$/i;
    matchedSomething = true;
  }

  if (text.includes("senior") || text.includes("seniors")) {
    filters.age_group = /^senior$/i;
    matchedSomething = true;
  }

  if (text.includes("young")) {
    filters.age = {
      ...(filters.age || {}),
      $gte: 16,
      $lte: 24
    };
    matchedSomething = true;
  }

  const aboveMatch = text.match(/above\s+(\d+)/);
  if (aboveMatch) {
    filters.age = {
      ...(filters.age || {}),
      $gte: Number(aboveMatch[1])
    };
    matchedSomething = true;
  }

  const belowMatch = text.match(/below\s+(\d+)/);
  if (belowMatch) {
    filters.age = {
      ...(filters.age || {}),
      $lte: Number(belowMatch[1])
    };
    matchedSomething = true;
  }

  for (const countryName in countryMap) {
    if (text.includes(`from ${countryName}`)) {
      filters.country_id = new RegExp(`^${countryMap[countryName]}$`, "i");
      matchedSomething = true;
      break;
    }
  }

  if (!matchedSomething) {
    return null;
  }

  return filters;
};

module.exports = parseNaturalLanguageQuery;
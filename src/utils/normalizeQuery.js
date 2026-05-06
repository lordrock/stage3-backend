const normalizeMongoFilterValue = (value) => {
  if (value instanceof RegExp) {
    return value.source.replace("^", "").replace("$", "").toLowerCase();
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const sorted = {};

    Object.keys(value)
      .sort()
      .forEach((key) => {
        sorted[key] = normalizeMongoFilterValue(value[key]);
      });

    return sorted;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  return value;
};

const normalizeFilters = (filters) => {
  const normalized = {};

  Object.keys(filters)
    .sort()
    .forEach((key) => {
      normalized[key] = normalizeMongoFilterValue(filters[key]);
    });

  return normalized;
};

const createCacheKey = ({ prefix, filters = {}, sort = {}, page = 1, limit = 10 }) => {
  return `${prefix}:${JSON.stringify({
    filters: normalizeFilters(filters),
    sort,
    page: Number(page),
    limit: Number(limit)
  })}`;
};

module.exports = {
  normalizeFilters,
  createCacheKey
};

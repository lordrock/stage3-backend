const isValidNumber = (value) => {
  if (value === undefined) return false;
  return !isNaN(value) && value !== "";
};

const getPagination = (page, limit) => {
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 10;

  const safePage = parsedPage < 1 ? 1 : parsedPage;
  const safeLimit = parsedLimit < 1 ? 10 : parsedLimit > 50 ? 50 : parsedLimit;

  const skip = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip
  };
};

const buildSortOptions = (sort_by, order) => {
  if (!sort_by) {
    return { created_at: -1 };
  }

  const allowedSortFields = ["age", "created_at", "gender_probability"];
  const allowedOrders = ["asc", "desc"];

  if (!allowedSortFields.includes(sort_by)) {
    return null;
  }

  if (order && !allowedOrders.includes(order)) {
    return null;
  }

  return {
    [sort_by]: order === "asc" ? 1 : -1
  };
};

const buildProfileFilters = (query) => {
  const {
    gender,
    age_group,
    country_id,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability
  } = query;

  const filters = {};

  if (gender) {
    filters.gender = new RegExp(`^${gender}$`, "i");
  }

  if (age_group) {
    filters.age_group = new RegExp(`^${age_group}$`, "i");
  }

  if (country_id) {
    filters.country_id = new RegExp(`^${country_id}$`, "i");
  }

  if (min_age !== undefined || max_age !== undefined) {
    filters.age = {};

    if (min_age !== undefined) {
      filters.age.$gte = Number(min_age);
    }

    if (max_age !== undefined) {
      filters.age.$lte = Number(max_age);
    }
  }

  if (min_gender_probability !== undefined) {
    filters.gender_probability = {
      $gte: Number(min_gender_probability)
    };
  }

  if (min_country_probability !== undefined) {
    filters.country_probability = {
      $gte: Number(min_country_probability)
    };
  }

  return filters;
};

module.exports = {
  isValidNumber,
  getPagination,
  buildSortOptions,
  buildProfileFilters
};
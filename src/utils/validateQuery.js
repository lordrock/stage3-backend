const { isValidNumber } = require("./queryHelpers");

const validateProfileQuery = (query) => {
  const {
    gender,
    age_group,
    country_id,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability,
    sort_by,
    order,
    page,
    limit
  } = query;

  const validGenders = ["male", "female"];
  const validAgeGroups = ["child", "teenager", "adult", "senior"];
  const validSortFields = ["age", "created_at", "gender_probability"];
  const validOrders = ["asc", "desc"];

  if (gender && !validGenders.includes(gender.toLowerCase())) {
    return false;
  }

  if (age_group && !validAgeGroups.includes(age_group.toLowerCase())) {
    return false;
  }

  if (country_id && country_id.length !== 2) {
    return false;
  }

  if (min_age !== undefined && !isValidNumber(min_age)) {
    return false;
  }

  if (max_age !== undefined && !isValidNumber(max_age)) {
    return false;
  }

  if (
    min_gender_probability !== undefined &&
    !isValidNumber(min_gender_probability)
  ) {
    return false;
  }

  if (
    min_country_probability !== undefined &&
    !isValidNumber(min_country_probability)
  ) {
    return false;
  }

  if (sort_by && !validSortFields.includes(sort_by)) {
    return false;
  }

  if (order && !validOrders.includes(order)) {
    return false;
  }

  if (page !== undefined && !isValidNumber(page)) {
    return false;
  }

  if (limit !== undefined && !isValidNumber(limit)) {
    return false;
  }

  if (
    min_age !== undefined &&
    max_age !== undefined &&
    Number(min_age) > Number(max_age)
  ) {
    return false;
  }

  if (
    min_gender_probability !== undefined &&
    (Number(min_gender_probability) < 0 || Number(min_gender_probability) > 1)
  ) {
    return false;
  }

  if (
    min_country_probability !== undefined &&
    (Number(min_country_probability) < 0 || Number(min_country_probability) > 1)
  ) {
    return false;
  }

  if (page !== undefined && Number(page) < 1) {
    return false;
  }

  if (limit !== undefined && (Number(limit) < 1 || Number(limit) > 50)) {
    return false;
  }

  return true;
};

module.exports = validateProfileQuery;
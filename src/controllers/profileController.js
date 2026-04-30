const { stringify } = require("csv-stringify/sync");
const { v7: uuidv7 } = require("uuid");

const Profile = require("../models/Profile");
const formatProfile = require("../utils/formatProfile");

const {
  buildProfileFilters,
  buildSortOptions,
  getPagination
} = require("../utils/queryHelpers");

const validateProfileQuery = require("../utils/validateQuery");
const parseNaturalLanguageQuery = require("../utils/nlQueryParser");

const getAgeGroup = (age) => {
  if (age >= 0 && age <= 12) return "child";
  if (age >= 13 && age <= 19) return "teenager";
  if (age >= 20 && age <= 59) return "adult";
  if (age >= 60) return "senior";
  return null;
};

const buildPaginationLinks = (req, page, limit, total) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const basePath = req.baseUrl + req.path;

  const buildLink = (targetPage) => {
    const query = {
      ...req.query,
      page: String(targetPage),
      limit: String(limit)
    };

    const params = new URLSearchParams(query);

    return `${basePath}?${params.toString()}`;
  };

  return {
    total_pages: totalPages,
    links: {
      self: buildLink(page),
      next: page < totalPages ? buildLink(page + 1) : null,
      prev: page > 1 ? buildLink(page - 1) : null
    }
  };
};

const getProfiles = async (req, res) => {
  try {
    const isValid = validateProfileQuery(req.query);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    const filters = buildProfileFilters(req.query);
    const sortOptions = buildSortOptions(req.query.sort_by, req.query.order);

    if (!sortOptions) {
      return res.status(400).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    const { page, limit, skip } = getPagination(req.query.page, req.query.limit);

    const total = await Profile.countDocuments(filters);

    const profiles = await Profile.find(filters)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const pagination = buildPaginationLinks(req, page, limit, total);

    return res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      total_pages: pagination.total_pages,
      links: pagination.links,
      data: profiles.map(formatProfile)
    });
  } catch (error) {
    console.error("GET profiles error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const searchProfiles = async (req, res) => {
  try {
    const { q, page, limit } = req.query;

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Missing or empty parameter"
      });
    }

    const filters = parseNaturalLanguageQuery(q);

    if (!filters) {
      return res.status(400).json({
        status: "error",
        message: "Unable to interpret query"
      });
    }

    const paginationData = getPagination(page, limit);

    const total = await Profile.countDocuments(filters);

    const profiles = await Profile.find(filters)
      .skip(paginationData.skip)
      .limit(paginationData.limit);

    const pagination = buildPaginationLinks(
      req,
      paginationData.page,
      paginationData.limit,
      total
    );

    return res.status(200).json({
      status: "success",
      page: paginationData.page,
      limit: paginationData.limit,
      total,
      total_pages: pagination.total_pages,
      links: pagination.links,
      data: profiles.map(formatProfile)
    });
  } catch (error) {
    console.error("Search profiles error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await Profile.findOne({ id });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }

    return res.status(200).json({
      status: "success",
      data: formatProfile(profile)
    });
  } catch (error) {
    console.error("Get profile by ID error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const createProfile = async (req, res) => {
  try {
    const name = req.body?.name;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Missing or empty name"
      });
    }

    const normalizedName = name.trim();

    const existingProfile = await Profile.findOne({ name: normalizedName });

    if (existingProfile) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: formatProfile(existingProfile)
      });
    }

    const [genderRes, ageRes, countryRes] = await Promise.all([
      fetch(`https://api.genderize.io?name=${encodeURIComponent(normalizedName)}`),
      fetch(`https://api.agify.io?name=${encodeURIComponent(normalizedName)}`),
      fetch(`https://api.nationalize.io?name=${encodeURIComponent(normalizedName)}`)
    ]);

    if (!genderRes.ok) {
      return res.status(502).json({
        status: "error",
        message: "Genderize returned an invalid response"
      });
    }

    if (!ageRes.ok) {
      return res.status(502).json({
        status: "error",
        message: "Agify returned an invalid response"
      });
    }

    if (!countryRes.ok) {
      return res.status(502).json({
        status: "error",
        message: "Nationalize returned an invalid response"
      });
    }

    const genderData = await genderRes.json();
    const ageData = await ageRes.json();
    const countryData = await countryRes.json();

    if (genderData.gender === null || genderData.count === 0) {
      return res.status(502).json({
        status: "error",
        message: "Genderize returned an invalid response"
      });
    }

    if (ageData.age === null) {
      return res.status(502).json({
        status: "error",
        message: "Agify returned an invalid response"
      });
    }

    if (!Array.isArray(countryData.country) || countryData.country.length === 0) {
      return res.status(502).json({
        status: "error",
        message: "Nationalize returned an invalid response"
      });
    }

    const topCountry = countryData.country.reduce((best, current) => {
      return current.probability > best.probability ? current : best;
    }, countryData.country[0]);

    const ageGroup = getAgeGroup(ageData.age);

    if (!ageGroup) {
      return res.status(500).json({
        status: "error",
        message: "Unable to classify age group"
      });
    }

    const newProfile = await Profile.create({
      id: uuidv7(),
      name: normalizedName,
      gender: genderData.gender,
      gender_probability: genderData.probability,
      age: ageData.age,
      age_group: ageGroup,
      country_id: topCountry.country_id,
      country_name: topCountry.country_id,
      country_probability: topCountry.probability,
      created_at: new Date()
    });

    return res.status(201).json({
      status: "success",
      data: formatProfile(newProfile)
    });
  } catch (error) {
    console.error("Create profile error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const exportProfiles = async (req, res) => {
  try {
    const { format } = req.query;

    if (format !== "csv") {
      return res.status(400).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    const isValid = validateProfileQuery(req.query);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    const filters = buildProfileFilters(req.query);
    const sortOptions = buildSortOptions(req.query.sort_by, req.query.order);

    if (!sortOptions) {
      return res.status(400).json({
        status: "error",
        message: "Invalid query parameters"
      });
    }

    const profiles = await Profile.find(filters).sort(sortOptions);

    const rows = profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      gender: profile.gender,
      gender_probability: profile.gender_probability,
      age: profile.age,
      age_group: profile.age_group,
      country_id: profile.country_id,
      country_name: profile.country_name,
      country_probability: profile.country_probability,
      created_at: profile.created_at
    }));

    const csv = stringify(rows, {
      header: true,
      columns: [
        "id",
        "name",
        "gender",
        "gender_probability",
        "age",
        "age_group",
        "country_id",
        "country_name",
        "country_probability",
        "created_at"
      ]
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="profiles_${timestamp}.csv"`
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error("Export profiles error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await Profile.findOne({ id });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found"
      });
    }

    await Profile.deleteOne({ id });

    return res.status(204).send();
  } catch (error) {
    console.error("Delete profile error:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

module.exports = {
  getProfiles,
  searchProfiles,
  getProfileById,
  createProfile,
  exportProfiles,
  deleteProfile
};
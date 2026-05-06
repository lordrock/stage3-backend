const fs = require("fs");
const csv = require("csv-parser");
const { v7: uuidv7 } = require("uuid");

const Profile = require("../models/Profile");
const { deleteCacheByPrefix } = require("../utils/cache");

const BATCH_SIZE = 1000;

const getAgeGroup = (age) => {
  if (age >= 0 && age <= 12) return "child";
  if (age >= 13 && age <= 19) return "teenager";
  if (age >= 20 && age <= 59) return "adult";
  if (age >= 60) return "senior";
  return null;
};

const normalizeGender = (gender) => {
  if (!gender) return null;

  const value = String(gender).trim().toLowerCase();

  if (value === "male" || value === "female") {
    return value;
  }

  return null;
};

const validateRow = (row) => {
  const name = row.name?.trim();
  const gender = normalizeGender(row.gender);
  const age = Number(row.age);
  const country_id = row.country_id?.trim().toUpperCase();
  const country_name = row.country_name?.trim();

  if (!name || !row.gender || !row.age || !country_id || !country_name) {
    return {
      valid: false,
      reason: "missing_fields"
    };
  }

  if (!gender) {
    return {
      valid: false,
      reason: "invalid_gender"
    };
  }

  if (!Number.isInteger(age) || age < 0) {
    return {
      valid: false,
      reason: "invalid_age"
    };
  }

  if (country_id.length !== 2) {
    return {
      valid: false,
      reason: "invalid_country"
    };
  }

  return {
    valid: true,
    data: {
      id: uuidv7(),
      name,
      gender,
      gender_probability: Number(row.gender_probability) || 1,
      age,
      age_group: row.age_group?.trim().toLowerCase() || getAgeGroup(age),
      country_id,
      country_name,
      country_probability: Number(row.country_probability) || 1,
      created_at: new Date()
    }
  };
};

const uploadProfilesCsv = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: "error",
      message: "CSV file is required"
    });
  }

  const summary = {
    status: "success",
    total_rows: 0,
    inserted: 0,
    skipped: 0,
    reasons: {
      duplicate_name: 0,
      invalid_age: 0,
      invalid_gender: 0,
      invalid_country: 0,
      missing_fields: 0,
      malformed_row: 0,
      database_error: 0
    }
  };

  let batch = [];

  const flushBatch = async () => {
    if (batch.length === 0) return;

    const operations = batch.map((profile) => ({
      updateOne: {
        filter: { name: profile.name },
        update: { $setOnInsert: profile },
        upsert: true
      }
    }));

    try {
      const result = await Profile.bulkWrite(operations, {
        ordered: false
      });

      summary.inserted += result.upsertedCount || 0;

      const duplicates = batch.length - (result.upsertedCount || 0);
      summary.skipped += duplicates;
      summary.reasons.duplicate_name += duplicates;
    } catch (error) {
      summary.skipped += batch.length;
      summary.reasons.database_error += batch.length;
    }

    batch = [];
  };

  try {
    const stream = fs.createReadStream(req.file.path).pipe(csv());

    stream.on("data", async (row) => {
      stream.pause();

      summary.total_rows += 1;

      try {
        const validation = validateRow(row);

        if (!validation.valid) {
          summary.skipped += 1;
          summary.reasons[validation.reason] += 1;
        } else {
          batch.push(validation.data);

          if (batch.length >= BATCH_SIZE) {
            await flushBatch();
          }
        }
      } catch (error) {
        summary.skipped += 1;
        summary.reasons.malformed_row += 1;
      }

      stream.resume();
    });

    stream.on("end", async () => {
      await flushBatch();

      fs.unlinkSync(req.file.path);

      deleteCacheByPrefix("profiles:");

      return res.status(200).json(summary);
    });

    stream.on("error", () => {
      return res.status(400).json({
        status: "error",
        message: "Invalid or malformed CSV file"
      });
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "CSV ingestion failed"
    });
  }
};

module.exports = {
  uploadProfilesCsv
};
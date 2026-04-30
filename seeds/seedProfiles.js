require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { v7: uuidv7 } = require("uuid");

const connectDB = require("../src/config/db");
const Profile = require("../src/models/Profile");

const seedProfiles = async () => {
  try {
    await connectDB();

    console.log("Starting profile seed...");

    const filePath = path.join(__dirname, "seed_profiles.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const parsedData = JSON.parse(rawData);

    if (!parsedData.profiles || !Array.isArray(parsedData.profiles)) {
      throw new Error("Invalid seed file format: 'profiles' array is missing");
    }

    const operations = parsedData.profiles.map((profile) => ({
      updateOne: {
        filter: { name: profile.name.trim() },
        update: {
          $set: {
            name: profile.name.trim(),
            gender: profile.gender,
            gender_probability: profile.gender_probability,
            age: profile.age,
            age_group: profile.age_group,
            country_id: profile.country_id,
            country_name: profile.country_name,
            country_probability: profile.country_probability
          },
          $setOnInsert: {
            id: uuidv7(),
            created_at: new Date().toISOString()
          }
        },
        upsert: true
      }
    }));

    const result = await Profile.bulkWrite(operations);

    console.log("Seeding completed successfully.");
    console.log(`Matched existing profiles: ${result.matchedCount}`);
    console.log(`Inserted new profiles: ${result.upsertedCount}`);
    console.log(`Modified existing profiles: ${result.modifiedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
};

seedProfiles();
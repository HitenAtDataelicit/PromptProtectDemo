const mongoose = require("mongoose");

const connectDB = async () => {
    let uri = process.env.MONGODB_URI;

    if (process.env.NODE_ENV === "test") {
        console.log("ALERT: Running in TEST mode. Using local test database.");
        uri = process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/promptprotect_test";
    }

    try {
        await mongoose.connect(uri);
        console.log("MongoDB Connected to:", uri.split("@").pop().split("/")[0]);
    } catch (err) {
        console.log("DB Error:", err);
        process.exit(1);
    }
};

module.exports = connectDB;

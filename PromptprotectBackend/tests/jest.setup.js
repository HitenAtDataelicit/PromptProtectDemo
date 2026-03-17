const mongoose = require("mongoose");
const { connect, closeDatabase } = require("./db.helpers");

mongoose.set('bufferCommands', false);
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_123";
process.env.ORG_KEY_SECRET = process.env.ORG_KEY_SECRET || "test_org_key_secret";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

console.log("[Jest Setup] NODE_ENV set to test. Defaults provided for secrets.");

beforeAll(async () => {
    console.log("[Jest Setup] beforeAll Hook Start");
    await connect();
    console.log("[Jest Setup] beforeAll Hook End");
});

afterAll(async () => {
    await closeDatabase();
});

jest.mock("../logger", () => ({
    auditLog: jest.fn()
}));

jest.mock("../analytics/sendAnalyticsEvent", () => ({
    sendAnalyticsEvent: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock("../services/email.service", () => ({
    send_email: jest.fn().mockResolvedValue(true)
}));

jest.setTimeout(60000);

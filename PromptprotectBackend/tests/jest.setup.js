const mongoose = require("mongoose");
const { connect, closeDatabase } = require("./db.helpers");

mongoose.set('bufferCommands', false);
process.env.NODE_ENV = 'test';
console.log("[Jest Setup] NODE_ENV set to test. Disabling buffering.");

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

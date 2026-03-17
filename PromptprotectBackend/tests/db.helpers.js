const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const connect = async () => {
    console.log("[DB Helper] Starting connection sequence...");
    process.env.NODE_ENV = 'test';

    if (mongoose.connection.readyState !== 0) {
        console.log("[DB Helper] Active connection found, closing...");
        await mongoose.connection.close();
    }

    console.log("[DB Helper] Creating MongoMemoryServer...");
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    console.log("[DB Helper] Memory DB URI obtained:", uri);

    mongoose.set('bufferCommands', false);
    await mongoose.connect(uri);

    if (mongoose.connection.readyState !== 1) {
        console.log("[DB Helper] Connection readyState is", mongoose.connection.readyState, "waiting for 'open'...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Timeout waiting for DB connection")), 10000);
            mongoose.connection.once('open', () => {
                clearTimeout(timeout);
                resolve();
            });
            mongoose.connection.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    console.log("[DB Helper] Memory DB Connected successfully.");
};

const closeDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
};

const clearDatabase = async () => {
    if (mongoose.connection.readyState === 0) return;

    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        try {
            await collection.deleteMany({});
        } catch (err) {
            console.warn(`Could not clear collection ${key}:`, err.message);
        }
    }
};

module.exports = { connect, closeDatabase, clearDatabase };

const mongoose = require('mongoose');

async function mongoConnect() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connection Successful...");
    } catch (err) {
        console.error(err.message);
        throw new Error("MongoDB connection error");
    }
}

module.exports = mongoConnect;
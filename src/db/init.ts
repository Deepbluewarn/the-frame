import mongoose from "mongoose";
declare global {
    var mongoose: any;
}

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function dbConnect() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI 환경변수가 없습니다.");
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, { bufferCommands: false }).then(m => m);
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}

export default dbConnect;

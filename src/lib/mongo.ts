import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error("Please add your Mongo URI to .env");
}

if (process.env.NODE_ENV === "development") {
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri, options);

    // Connect and confirm connection here:
    (global as any)._mongoClientPromise = client.connect().then(async (client) => {
      try {
        await client.db("admin").command({ ping: 1 });
        console.log("✅ MongoDB connected successfully");
      } catch (error) {
        console.error("❌ MongoDB connection ping failed:", error);
        throw error;
      }
      return client;
    });
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);

  clientPromise = client.connect().then(async (client) => {
    try {
      await client.db("admin").command({ ping: 1 });
      console.log("✅ MongoDB connected successfully");
    } catch (error) {
      console.error("❌ MongoDB connection ping failed:", error);
      throw error;
    }
    return client;
  });
}

export default clientPromise;

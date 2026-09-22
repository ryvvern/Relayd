import IORedis from "ioredis";
import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("Missing required environment variable: REDIS_URL");
}

// BullMQ requires maxRetriesPerRequest: null on the connection it uses.
// See https://docs.bullmq.io/guide/going-to-production#maxretriesperrequest
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const deliveriesQueue = new Queue("deliveries", { connection });

import { deliveriesQueue, connection } from "../lib/redis";

async function main() {
  const job = await deliveriesQueue.add("test", { test: true });

  if (!job.id) {
    throw new Error("Job was added but no job id was returned.");
  }

  console.log(`✅ Redis connection succeeded. Added job with id: ${job.id}`);
}

main()
  .catch((error) => {
    console.error("❌ Redis connection failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await deliveriesQueue.close();
    connection.disconnect();
  });

import "dotenv/config";
import Redis from "ioredis";
import { S3SnapshotStorage } from "./infrastructure/S3SnapshotStorage";
import { RedisUpdateRepository } from "./infrastructure/redis/UpdateRepository";
import { DefaultYjsProcessor } from "./domain/YjsProcessor";
import { SnapshotService } from "./services/SnapshotService";
import { RedisStreamJobConsumer } from "./infrastructure/redis/JobConsumer";
import { SnapshotWorker } from "./worker/SnapshotWorker";
import { MindmapTicketIssuer } from "./infrastructure/MindmapTicketIssuer";
import { WebsocketSyncClient } from "./infrastructure/WebsocketSyncClient";
import { LastEntryIdRepository } from "./infrastructure/redis/LastEntryIdRepository";
import { RedisStreamJobPublisher } from "./infrastructure/redis/JobPublisher";

const redis = new Redis({
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
});

const updateRepo = new RedisUpdateRepository(redis);

const lastEntryIdRepo = new LastEntryIdRepository(redis);

const storage = new S3SnapshotStorage({
    region: process.env.AWS_REGION!,
    bucket: process.env.S3_BUCKET!,
    keyPrefix: process.env.S3_PREFIX!,
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

const yjs = new DefaultYjsProcessor();

const ttl = Number(process.env.TOKEN_TTL_SEC);

const ticketIssuer = new MindmapTicketIssuer(
    process.env.JWT_MINDMAP_SECRET!,
    Number.isFinite(ttl) && ttl > 0 ? ttl : undefined,
);

const syncClient = new WebsocketSyncClient(ticketIssuer, process.env.WS_BASE_URL!);

const jobConsumer = new RedisStreamJobConsumer(redis);
const jobPublisher = new RedisStreamJobPublisher(redis);

const service = new SnapshotService({
    updateRepo,
    yjs,
    storage,
    syncClient,
    lastEntryIdRepo,
    jobPublisher,
});

const worker = new SnapshotWorker({
    jobConsumer,
    service,
    blockMs: Number(process.env.JOB_BLOCK_MS ?? 10000),
    count: Number(process.env.JOB_COUNT ?? 1),
});

async function main() {
    await worker.init();
    await worker.start();
}

main();

process.on("SIGINT", async () => {
    worker.stop();
    await redis.quit();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    worker.stop();
    await redis.quit();
    process.exit(0);
});

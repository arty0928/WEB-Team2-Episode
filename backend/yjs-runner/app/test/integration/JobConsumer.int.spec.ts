process.env.JOB_GROUP_NAME = "test-group";
process.env.JOB_CONSUMER_NAME = "test-worker";
process.env.JOB_ROOM_FIELD = "rid";
process.env.JOB_TYPE_FIELD = "t";
process.env.JOB_MAX_TRY = "5";

import Redis from "ioredis";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { RedisStreamJobConsumer } from "../../src/infrastructure/redis/JobConsumer";
import { REDIS_KEYS } from "../../src/infrastructure/redis/Constants";
import { JobConfig } from "../../src/infrastructure/redis/JobConfig";
import { JobType } from "../../src/contracts/Job";

describe("RedisStreamJobConsumer Integration Test", () => {
    let redisContainer: StartedTestContainer;
    let redis: Redis;
    let consumer: RedisStreamJobConsumer;

    const STREAM_KEY = REDIS_KEYS.JOB_STREAM;

    beforeAll(async () => {
        redisContainer = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();

        const host = redisContainer.getHost();
        const port = redisContainer.getMappedPort(6379);
        redis = new Redis({ host, port });

        consumer = new RedisStreamJobConsumer(redis);
        await consumer.init();
    }, 30000);

    afterAll(async () => {
        await redis.quit();
        await redisContainer.stop();
    });

    beforeEach(async () => {
        await redis.flushall();
        await consumer.init();
    });

    it("메시지를 발행하면 Read를 통해 Job 형태로 읽어와야 한다", async () => {
        const testRoomId = "room-123";

        await redis.xadd(STREAM_KEY, "*", JobConfig.roomIdField, testRoomId, JobConfig.typeField, JobType.SNAPSHOT);

        const jobs = await consumer.read(1000, 1);

        expect(jobs.length).toBe(1);
        expect(jobs[0].roomId).toBe(testRoomId);
        expect(jobs[0].entryId).toBeDefined();
        expect(jobs[0].type).toBe(JobType.SNAPSHOT);
    });

    it("ACK를 보내면 해당 메시지는 PEL에서 제거되어야 한다", async () => {
        const testRoomId = "room-456";

        await redis.xadd(STREAM_KEY, "*", JobConfig.roomIdField, testRoomId, JobConfig.typeField, JobType.SNAPSHOT);

        const jobs = await consumer.read(1000, 1);
        expect(jobs.length).toBe(1);

        const messageId = jobs[0].entryId;

        const pendingBefore = await redis.xpending(STREAM_KEY, JobConfig.groupName);
        expect(Number(pendingBefore[0])).toBeGreaterThanOrEqual(1);

        await consumer.ack([messageId]);

        const pendingAfter = await redis.xpending(STREAM_KEY, JobConfig.groupName);
        expect(Number(pendingAfter[0])).toBe(0);
    });

    it("데이터가 없으면 빈 배열 반환", async () => {
        const jobs = await consumer.read(100, 1);
        expect(jobs).toEqual([]);
    });

    it("maxRetries 초과 시 자동 ACK되고 읽히지 않아야 한다", async () => {
        const testRoomId = "poison-pill-room";

        await redis.xadd(STREAM_KEY, "*", JobConfig.roomIdField, testRoomId, JobConfig.typeField, JobType.SNAPSHOT);

        await consumer.read(100, 1);

        for (let i = 0; i < JobConfig.maxRetries + 1; i++) {
            await consumer.read(100, 1);
        }

        const jobs = await consumer.read(100, 1);
        expect(jobs.length).toBe(0);

        const pending = await redis.xpending(STREAM_KEY, JobConfig.groupName);
        expect(Number(pending[0])).toBe(0);
    });

    it("maxRetries 이내라면 다시 읽어와야 한다", async () => {
        const testRoomId = "retry-room";

        await redis.xadd(STREAM_KEY, "*", JobConfig.roomIdField, testRoomId, JobConfig.typeField, JobType.SNAPSHOT);

        const first = await consumer.read(1000, 1);
        expect(first.length).toBe(1);

        const jobs = await consumer.read(1000, 1);

        expect(jobs.length).toBe(1);
        expect(jobs[0].roomId).toBe(testRoomId);
        expect(jobs[0].type).toBe(JobType.SNAPSHOT);

        const pending = await redis.xpending(STREAM_KEY, JobConfig.groupName);
        expect(Number(pending[0])).toBe(1);
    });
});

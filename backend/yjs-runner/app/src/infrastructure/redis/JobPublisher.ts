import type Redis from "ioredis";
import { REDIS_KEYS } from "./Constants";
import { JobType } from "../../contracts/Job";
import { JobConfig } from "./JobConfig";

export class RedisStreamJobPublisher {
    constructor(private readonly redis: Redis) {}

    async publishSync(roomId: string): Promise<void> {
        if (!roomId) throw new Error("roomId is required");

        await this.redis.xadd(
            REDIS_KEYS.JOB_STREAM,
            "*",
            JobConfig.typeField,
            JobType.SYNC,
            JobConfig.roomIdField,
            roomId,
        );
    }
}

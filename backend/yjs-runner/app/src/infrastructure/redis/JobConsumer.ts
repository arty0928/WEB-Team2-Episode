import type Redis from "ioredis";
import { Job, JobType } from "../../contracts/Job";
import { RedisStreamEntry, RedisStreamReadResult } from "../../contracts/RedisStreamReadResult";
import { StreamPendingEntries } from "../../contracts/StreamPendingEntries";
import { REDIS_KEYS } from "./Constants";
import { JobConfig } from "./JobConfig";

export interface JobConsumer {
    init(): Promise<void>;
    read(blockMs: number, count?: number): Promise<Job[]>;
    ack(entryId: string[]): Promise<void>;
    del(messageIds: string[]): Promise<number>;
    discard(messageIds: string[]): Promise<void>;
    clearInflight(targets: { roomId: string; type: string }[]): Promise<void>;
}

export class RedisStreamJobConsumer implements JobConsumer {
    constructor(private readonly redis: Redis) {}

    async init(): Promise<void> {
        try {
            await this.redis.xgroup("CREATE", REDIS_KEYS.JOB_STREAM, JobConfig.groupName, "$", "MKSTREAM");
        } catch (err: any) {
            if (!err?.message?.includes("BUSYGROUP")) {
                throw err;
            }
        }
    }

    async read(blockMs: number, count: number = 1): Promise<Job[]> {
        try {
            return await this._executeRead(blockMs, count);
        } catch (err: any) {
            if (err?.message?.includes("NOGROUP")) {
                await this.init();
                return await this._executeRead(blockMs, count);
            }
            throw err;
        }
    }

    private async _executeRead(blockMs: number, count: number): Promise<Job[]> {
        const pendingResults = (await this.redis.xreadgroup(
            "GROUP",
            JobConfig.groupName,
            JobConfig.consumerName,
            "COUNT",
            count,
            "STREAMS",
            REDIS_KEYS.JOB_STREAM,
            "0",
        )) as RedisStreamReadResult | null;

        if (pendingResults?.[0]?.[1]?.length) {
            const pendingJobs = await this.processPending(count, pendingResults);
            if (pendingJobs !== null) return pendingJobs;
        }

        const results = (await this.redis.xreadgroup(
            "GROUP",
            JobConfig.groupName,
            JobConfig.consumerName,
            "COUNT",
            count,
            "BLOCK",
            blockMs,
            "STREAMS",
            REDIS_KEYS.JOB_STREAM,
            ">",
        )) as RedisStreamReadResult | null;

        if (!results?.length) return [];

        const { jobs, badEntryIds } = this.parseEntries(results);
        await this.discard(badEntryIds);

        return jobs;
    }

    async ack(entryIds: string[]): Promise<void> {
        if (!entryIds?.length) return;
        await this.redis.xack(REDIS_KEYS.JOB_STREAM, JobConfig.groupName, ...entryIds);
    }

    async del(messageIds: string[]): Promise<number> {
        if (!messageIds?.length) return 0;
        return await this.redis.xdel(REDIS_KEYS.JOB_STREAM, ...messageIds);
    }

    async discard(messageIds: string[]): Promise<void> {
        if (!messageIds?.length) return;
        await this.ack(messageIds);
        await this.del(messageIds);
    }

    private async processPending(count: number, pendingResults: RedisStreamReadResult): Promise<Job[] | null> {
        const [, entries] = pendingResults[0];
        const entryIds = entries.map(([id]) => id);

        const pendingDetails = (await this.redis.xpending(
            REDIS_KEYS.JOB_STREAM,
            JobConfig.groupName,
            "IDLE",
            0,
            entryIds[0],
            entryIds[entryIds.length - 1],
            count,
        )) as StreamPendingEntries;

        const deliveryById = new Map<string, number>(pendingDetails.map((p) => [p[0], Number(p[3])]));

        const validEntries: RedisStreamEntry[] = [];
        const entriesToAbandon: RedisStreamEntry[] = [];

        for (const entry of entries) {
            const [id] = entry;
            const deliveryCount = deliveryById.get(id);
            if (deliveryCount == null) continue;

            if (deliveryCount > JobConfig.maxRetries) {
                entriesToAbandon.push(entry);
                console.warn(`[JobConsumer] 재시도 초과(${deliveryCount}), 포기 및 삭제: ${id}`);
            } else {
                validEntries.push(entry);
            }
        }

        if (entriesToAbandon.length > 0) {
            await this.discard(entriesToAbandon.map((e) => e[0]));

            const { jobs: abandonedJobs } = this.parseEntries([[REDIS_KEYS.JOB_STREAM, entriesToAbandon]]);
            await this.clearInflight(abandonedJobs);
        }

        if (validEntries.length > 0) {
            const { jobs, badEntryIds } = this.parseEntries([[REDIS_KEYS.JOB_STREAM, validEntries]]);
            await this.discard(badEntryIds);
            return jobs.length > 0 ? jobs : null;
        }

        return null;
    }

    private parseEntries(results: RedisStreamReadResult): { jobs: Job[]; badEntryIds: string[] } {
        const [, entries] = results[0];
        const badEntryIds: string[] = [];
        const jobs: Job[] = [];

        for (const [entryId, rawData] of entries) {
            try {
                const data: Record<string, string> = {};
                for (let i = 0; i < rawData.length; i += 2) {
                    data[rawData[i]] = rawData[i + 1];
                }

                const rawType = data[JobConfig.typeField] as JobType;
                if (rawType !== JobType.SNAPSHOT && rawType !== JobType.SYNC) {
                    throw new Error(`Unknown job type: ${rawType}`);
                }

                const roomId = data[JobConfig.roomIdField];
                if (!roomId) {
                    throw new Error(`Missing roomId field`);
                }

                jobs.push({ entryId, roomId, type: rawType });
            } catch (error) {
                console.error(`[RedisJobConsumer] 파싱 실패 entryId=${entryId}`, error);
                badEntryIds.push(entryId);
            }
        }

        return { jobs, badEntryIds };
    }

    async clearInflight(targets: { roomId: string; type: string }[]): Promise<void> {
        if (!targets?.length) return;

        const keys = targets.map((t) => `${REDIS_KEYS.ROOM_STREAM_PREFIX}${t.roomId}:inflight:${t.type}`);

        try {
            await this.redis.del(...keys);
        } catch (e) {
            console.warn(`[JobConsumer] inflight clear failed error=${String(e)}`);
        }
    }
}

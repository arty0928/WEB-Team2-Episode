import type { JobConsumer } from "../infrastructure/redis/JobConsumer";
import type { SnapshotService } from "../services/SnapshotService";
import type { Job } from "../contracts/Job";
import wait from "waait";

export class SnapshotWorker {
    private running = false;

    constructor(
        private readonly deps: {
            jobConsumer: JobConsumer;
            service: SnapshotService;
            blockMs: number;
            count?: number;
        },
    ) {}

    async init(): Promise<void> {
        await this.deps.jobConsumer.init();
    }

    async start(): Promise<void> {
        this.running = true;

        while (this.running) {
            try {
                const jobs = await this.deps.jobConsumer.read(this.deps.blockMs, this.deps.count);
                if (!jobs || jobs.length === 0) continue;

                const successIds: string[] = [];
                const successJobs: Job[] = [];

                for (const job of jobs) {
                    try {
                        await this.deps.service.process(job);
                        successIds.push(job.entryId);
                        successJobs.push(job);
                        console.log(
                            `[Worker] ${job.type} Job 처리 완료 entryId: ${job.entryId}  roomId: ${job.roomId}`,
                        );
                    } catch (error) {
                        console.error(
                            `[Worker] ${job.type} Job 처리 실패! entryId: ${job.entryId}  roomId: ${job.roomId}`,
                            error,
                        );
                    }
                }

                if (successIds.length) {
                    await this.deps.jobConsumer.ack(successIds);
                    await this.deps.jobConsumer.del(successIds);
                    await this.deps.jobConsumer.clearInflight(successJobs);
                }
            } catch (e) {
                console.error("[Worker] 전역 Error:", e);
                await wait(this.deps.blockMs);
            }
        }
    }

    stop(): void {
        this.running = false;
    }
}

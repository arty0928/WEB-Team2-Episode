import type { MindmapCommand, MindmapCommandMeta } from "@/features/mindmap/types/mindmapCommandType";

export const TRANSACTION_TAG = {
    USER_COMMAND: "user-command",
    INIT_ROOT: "init-root",

    MINDMAP_COMMAND: "mindmap-command",
    MINDMAP_COMMAND_BATCH: "mindmap-command-batch",
    MINDMAP_INIT_LAYOUT: "mindmap-init-layout",
} as const;

export type TransactionTag = (typeof TRANSACTION_TAG)[keyof typeof TRANSACTION_TAG];

const TAG_SET = new Set<string>(Object.values(TRANSACTION_TAG));

export function isTransactionTag(x: unknown): x is TransactionTag {
    return typeof x === "string" && TAG_SET.has(x);
}

function isObject(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null;
}

function isOriginObj(x: unknown): x is { type: unknown } {
    return isObject(x) && "type" in x;
}

export function getOriginTag(origin: unknown): TransactionTag | null {
    if (isTransactionTag(origin)) return origin;
    if (isOriginObj(origin) && isTransactionTag(origin.type)) return origin.type;
    return null;
}

export const transactionOrigin = {
    mindmapCommand: (cmd: MindmapCommand): MindmapCommandTxOrigin => ({
        tag: TRANSACTION_TAG.MINDMAP_COMMAND,
        cmdType: cmd.type,
        meta: cmd.meta,
    }),

    mindmapCommandBatch: (cmds: MindmapCommand[], meta?: Partial<MindmapCommandMeta>) => ({
        tag: TRANSACTION_TAG.MINDMAP_COMMAND_BATCH,
        cmdTypes: cmds.map((c) => c.type),
        count: cmds.length,
        meta,
    }),

    mindmapInitLayout: () => ({
        tag: TRANSACTION_TAG.MINDMAP_INIT_LAYOUT,
    }),
} as const;

export type MindmapCommandBatchTxOrigin = {
    tag: typeof TRANSACTION_TAG.MINDMAP_COMMAND_BATCH;
    cmdTypes: MindmapCommand["type"][];
    count: number;
    meta?: Partial<MindmapCommandMeta>;
};

export type MindmapInitLayoutTxOrigin = {
    tag: typeof TRANSACTION_TAG.MINDMAP_INIT_LAYOUT;
};

export type MindmapCommandTxOrigin = {
    tag: typeof TRANSACTION_TAG.MINDMAP_COMMAND;
    cmdType: MindmapCommand["type"];
    meta: MindmapCommandMeta;
};

export function isMindmapCommandTxOrigin(origin: unknown): origin is MindmapCommandTxOrigin {
    if (!isObject(origin)) return false;

    const tag = "tag" in origin ? origin.tag : "type" in origin ? origin.type : undefined;

    return (
        tag === TRANSACTION_TAG.MINDMAP_COMMAND &&
        "cmdType" in origin &&
        typeof origin.cmdType === "string" &&
        "meta" in origin &&
        origin.meta !== null
    );
}

export function getTransactionTag(origin: unknown): TransactionTag | null {
    if (!origin) return null;

    if (typeof origin === "string") {
        return isTransactionTag(origin) ? origin : null;
    }

    if (isObject(origin)) {
        if ("tag" in origin && isTransactionTag(origin.tag)) return origin.tag;
    }

    return null;
}

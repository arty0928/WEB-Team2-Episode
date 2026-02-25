export const JobConfig = {
    groupName: process.env.JOB_GROUP_NAME!,
    consumerName: process.env.JOB_CONSUMER_NAME!,
    maxRetries: Number(process.env.JOB_MAX_TRY ?? 3),

    roomIdField: process.env.JOB_ROOM_FIELD ? process.env.JOB_ROOM_FIELD : "rid",

    typeField: process.env.JOB_TYPE_FIELD ? process.env.JOB_TYPE_FIELD : "t",
} as const;

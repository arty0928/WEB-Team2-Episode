import { BaseError } from "@/utils/errors";

export const throwOnError = (error: Error) => {
    return error instanceof BaseError && error.displayType === "replace";
};

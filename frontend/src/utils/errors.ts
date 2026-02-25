import { ENV } from "@/constants/env";
import { ApiError } from "@/features/auth/types/api";
import { MAX_NODE_COUNT } from "@/features/mindmap/constants/node";
import { ERROR_CODES, ErrorCode } from "@/shared/constants/error";

type ErrorStatus = number;
type ErrorMessage = (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | string;
type ErrorDisplayType = "replace" | "alert";

type BaseErrorParams = {
    status: ErrorStatus;
    code: ErrorCode;
    message: ErrorMessage;
    isFatal?: boolean;
    displayType?: ErrorDisplayType;
};

type ErrorOptions = {
    message?: ErrorMessage;
    isFatal?: boolean;
    displayType?: ErrorDisplayType;
};

export class BaseError extends ApiError {
    public message: ErrorMessage;
    public code: ErrorCode;
    public status: ErrorStatus;
    public isFatal: boolean;
    public displayType: ErrorDisplayType;

    constructor({ isFatal = false, displayType = "alert", status, code, message }: BaseErrorParams) {
        super(status, code, message);

        this.message = ENV.IS_PROD ? message : `${message} (코드, 로직에 문제가 없는지 검토해주세요.)`;
        this.code = code;
        this.status = status;
        this.isFatal = isFatal;
        this.displayType = displayType;

        this.name = new.target.name;
    }
}

/** 400: 잘못된 요청 */
export class BadRequestError extends BaseError {
    constructor(options: ErrorOptions = {}) {
        const { message = "잘못된 요청입니다.", isFatal = false, displayType = "replace" } = options;
        super({
            status: 400,
            code: "INVALID_REQUEST",
            message,
            isFatal,
            displayType,
        });
    }
}

/** 401: 인증 필요 */
export class UnauthorizedError extends BaseError {
    constructor(options: ErrorOptions = {}) {
        const { message = "사용자 인증이 필요합니다.", isFatal = false, displayType = "alert" } = options;
        super({
            status: 401,
            code: "UNAUTHORIZED",
            message,
            isFatal,
            displayType,
        });
    }
}

/** 404: 리소스 없음 */
export class NotFoundError extends BaseError {
    constructor(options: ErrorOptions = {}) {
        const { message = "요청하신 리소스를 찾을 수 없습니다.", isFatal = true, displayType = "replace" } = options;
        super({
            status: 404,
            code: "NOT_FOUND",
            message,
            isFatal,
            displayType,
        });
    }
}

/** 500: 서버 내부 오류 */
export class InternalServerError extends BaseError {
    constructor(options: ErrorOptions = {}) {
        const {
            message = "서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
            isFatal = true,
            displayType = "replace",
        } = options;
        super({
            status: 500,
            code: "INTERNAL_ERROR",
            message,
            isFatal,
            displayType,
        });
    }
}

export class NodeLimitExceededError extends BaseError {
    constructor(max: number = MAX_NODE_COUNT, options: Omit<ErrorOptions, "message"> = {}) {
        super({
            status: 400,
            code: "INVALID_REQUEST",
            message: `노드는 최대 ${max}개까지 추가할 수 있어요.`,
            isFatal: options.isFatal ?? false,
            displayType: options.displayType ?? "alert",
        });
    }
}

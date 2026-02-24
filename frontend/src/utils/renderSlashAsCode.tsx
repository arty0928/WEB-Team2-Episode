import { Fragment, type ReactNode } from "react";

import InlineCodeBlock from "@/shared/components/inlineCodeBlock/InlineCodeBlock";

type RenderTokenAsCodeOptions = {
    /**
     * 토큰을 텍스트에서 찾는 기준
     * URL 같은 케이스를 피하려면 " / " 처럼 공백 포함 토큰이 안전합니다.
     */
    token: string;
    codeText: string;
    wrapperClassName?: string;
};

export function renderTokenAsCode(text: string, options: RenderTokenAsCodeOptions): ReactNode {
    const { token, codeText, wrapperClassName = "mx-1 inline-flex" } = options;

    const parts = text.split(token);
    if (parts.length <= 1) return text;

    return (
        <>
            {parts.map((part, i) => (
                <Fragment key={i}>
                    {part}
                    {i < parts.length - 1 ? (
                        <span className={wrapperClassName}>
                            <InlineCodeBlock>{codeText}</InlineCodeBlock>
                        </span>
                    ) : null}
                </Fragment>
            ))}
        </>
    );
}

export function renderSlashAsCode(text: string): ReactNode {
    return renderTokenAsCode(text, { token: " / ", codeText: "/" });
}

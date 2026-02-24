import { memo } from "react";

import { cn } from "@/utils/cn";

type InlineCodeBlockProps = {
    children: string;
    className?: string;
};

const InlineCodeBlock = memo(function InlineCodeBlock({ children, className }: InlineCodeBlockProps) {
    return (
        <code
            className={cn(
                "inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-text-main2",
                className,
            )}
        >
            {children}
        </code>
    );
});

export default InlineCodeBlock;

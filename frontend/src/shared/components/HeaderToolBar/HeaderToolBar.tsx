import { ComponentPropsWithoutRef, ReactNode } from "react";

import Icon from "@/shared/components/icon/Icon";
import Row from "@/shared/components/row/Row";
import { cn } from "@/utils/cn";

type HeaderToolBarProps = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
    title: ReactNode;
    onBack?: () => void;
    leftSlot?: ReactNode;
    centerSlot?: ReactNode;
    rightSlot?: ReactNode;
};

export default function HeaderToolBar({
    title,
    onBack,
    leftSlot,
    centerSlot,
    rightSlot,
    className,
    ...rest
}: HeaderToolBarProps) {
    const handleBack = () => {
        if (onBack) return onBack();
        if (typeof window !== "undefined") window.history.back();
    };

    const defaultLeftAction = (
        <button
            type="button"
            onClick={handleBack}
            aria-label="뒤로가기"
            className="-m-2 p-2 rounded-lg text-text-main1 hover:bg-gray-100 active:bg-gray-200"
        >
            <Icon name="ic_chevron_left" size={20} />
        </button>
    );

    return (
        <header
            className={cn(
                "w-full flex flex-col items-start",
                "py-3 px-5",
                "border-b border-gray-200 bg-base-white",
                className,
            )}
            {...rest}
        >
            <Row
                leftSlot={leftSlot ?? defaultLeftAction}
                contents={
                    <div className="min-w-0 flex items-center gap-4">
                        {typeof title === "string" ? (
                            <h1 className="typo-title-18-bold text-text-main1 whitespace-nowrap">{title}</h1>
                        ) : (
                            title
                        )}
                        {centerSlot}
                    </div>
                }
                rightSlot={<div className="shrink-0 flex items-center gap-2">{rightSlot}</div>}
            />
        </header>
    );
}

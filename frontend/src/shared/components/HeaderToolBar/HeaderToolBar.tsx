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
            // p-2(8px), rounded-lg(8px)
            className="-m-2 p-2 rounded-lg text-text-main1 hover:bg-gray-100 active:bg-gray-200"
        >
            <Icon name="ic_chevron_left" size={20} />
        </button>
    );

    return (
        <header
            className={cn(
                // h-15: 3.75rem (60px)로 높이를 고정하여 내부 요소 변화에도 헤더 크기 유지
                "w-full h-star-sheet-header flex items-center shrink-0",
                "px-5", // py-3 대신 items-center로 세로 중앙 정렬
                "border-b border-gray-200 bg-base-white z-50",
                className,
            )}
            {...rest}
        >
            {/* Row 컴포넌트가 내부에서 flex-1로 꽉 차도록 설정 */}
            <Row
                className="w-full items-center"
                leftSlot={leftSlot ?? defaultLeftAction}
                contents={
                    <div className="min-w-0 flex items-center gap-4">
                        {typeof title === "string" ? (
                            <h1 className="typo-title-18-bold text-text-main1 whitespace-nowrap overflow-hidden text-ellipsis">
                                {title}
                            </h1>
                        ) : (
                            title
                        )}
                        {centerSlot}
                    </div>
                }
                rightSlot={
                    // 버튼이 추가되어도 레이아웃이 깨지지 않게 flex 유지
                    <div className="shrink-0 flex items-center gap-2 min-h-10">{rightSlot}</div>
                }
            />
        </header>
    );
}

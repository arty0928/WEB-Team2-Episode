import { cva, type VariantProps } from "class-variance-authority";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/shared/components/button/Button";
import Icon from "@/shared/components/icon/Icon";
import Modal from "@/shared/components/modal/Modal";
import { cn } from "@/utils/cn";
import { renderSlashAsCode } from "@/utils/renderSlashAsCode";

export type GifModalSize = "sm" | "md" | "lg";

export type GifModalItem = {
    gifSrc: string;
    title: string;
    description?: string;
};

type GifModalProps = {
    items?: readonly GifModalItem[];
    size?: GifModalSize;
    defaultOpen?: boolean;
    trigger?: ReactNode;
    className?: string;
};

const textBlockHeightBySize: Record<GifModalSize, string> = {
    lg: "min-h-8",
    md: "min-h-5",
    sm: "min-h-3",
};

const titleTypoBySize: Record<GifModalSize, string> = {
    lg: "typo-title-20-bold text-text-main1",
    md: "typo-title-16-bold text-text-main1",
    sm: "typo-title-14-bold text-text-main1",
};

const descTypoBySize: Record<GifModalSize, string> = {
    lg: "typo-body-15-regular text-text-sub1",
    md: "typo-body-14-regular text-text-sub1",
    sm: "typo-body-13-regular text-text-sub1",
};

const frameVariants = cva("flex flex-col gap-6", {
    variants: {
        size: {
            lg: "w-110",
            md: "w-85",
            sm: "w-60",
        },
    },
    defaultVariants: {
        size: "lg",
    },
});

const mediaVariants = cva("relative w-full overflow-hidden rounded-gif", {
    variants: {
        size: {
            lg: "h-80",
            md: "h-60",
            sm: "h-40",
        },
    },
    defaultVariants: {
        size: "lg",
    },
});

const navButtonVariants = cva("w-14", {
    variants: {
        size: {
            lg: "p-3",
            md: "p-2.5",
            sm: "p-2",
        },
    },
    defaultVariants: {
        size: "lg",
    },
});

const DefaultTrigger = memo(function DefaultTrigger() {
    return (
        <Button leftSlot={<Icon name="ic_info" />} borderRadius="lg" variant="ghost" size="xs">
            가이드
        </Button>
    );
});

type MediaProps = VariantProps<typeof mediaVariants> & {
    gifSrc: string;
};

const Media = memo(function Media({ gifSrc, size }: MediaProps) {
    return (
        <div className={cn(mediaVariants({ size }), "max-h-80 min-h-80 overflow-hidden relative")}>
            <img src={gifSrc} alt="" className="w-auto h-[101%] object-cover block my-0 mx-auto" />
            <Modal.CloseIcon className="absolute right-2 top-2" />
        </div>
    );
});

type TextBlockProps = {
    title: string;
    description?: string;
    size: GifModalSize;
};

const TextBlock = memo(function TextBlock({ title, description, size }: TextBlockProps) {
    return (
        <div className={cn("flex w-full flex-col gap-4", textBlockHeightBySize[size])}>
            <h2 className={cn("pl-2 w-full whitespace-normal wrap-break-word leading-relaxed", titleTypoBySize[size])}>
                {renderSlashAsCode(title)}
            </h2>
            {description ? (
                <p className={cn("w-full whitespace-normal wrap-break-word", descTypoBySize[size])}>{description}</p>
            ) : null}
        </div>
    );
});

type DotsProps = {
    total: number;
    index: number;
};

const Dots = memo(function Dots({ total, index }: DotsProps) {
    const dots = useMemo(() => {
        return Array.from({ length: total }).map((_, i) => (
            <span key={i} className={cn("h-2 w-2 rounded-full", i === index ? "bg-primary" : "bg-gray-300")} />
        ));
    }, [total, index]);

    return <div className="flex items-center gap-2">{dots}</div>;
});

type FooterProps = {
    size: GifModalSize;
    total: number;
    index: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
};

const Footer = memo(function Footer({ size, total, index, hasPrev, hasNext, onPrev, onNext }: FooterProps) {
    return (
        <div className="flex w-full items-center justify-between">
            {hasPrev ? (
                <Button
                    type="button"
                    onClick={onPrev}
                    size="xs"
                    variant="ghost"
                    borderRadius="lg"
                    className={cn(
                        "bg-gray-100 hover:bg-gray-200 active:bg-gray-200 typo-body-14-regular",
                        navButtonVariants({ size }),
                    )}
                >
                    이전
                </Button>
            ) : (
                <div className="w-14" />
            )}

            <Dots total={total} index={index} />

            {hasNext ? (
                <Button
                    type="button"
                    onClick={onNext}
                    size="xs"
                    variant="primary"
                    borderRadius="lg"
                    className={cn("typo-body-14-regular", navButtonVariants({ size }))}
                >
                    다음
                </Button>
            ) : (
                <div className="w-14" />
            )}
        </div>
    );
});

function clampIndex(index: number, length: number) {
    if (length <= 0) return 0;
    return Math.max(0, Math.min(index, length - 1));
}

export default function GifModal({ items = [], size = "lg", defaultOpen, trigger, className }: GifModalProps) {
    const [index, setIndex] = useState(0);

    const resetToFirst = useCallback(() => {
        setIndex(0);
    }, []);

    useEffect(() => {
        setIndex((prev) => clampIndex(prev, items.length));
    }, [items.length]);

    const safeIndex = clampIndex(index, items.length);
    const current = items[safeIndex];
    if (!current) return null;

    const hasPrev = safeIndex > 0;
    const hasNext = safeIndex < items.length - 1;

    const handlePrev = useCallback(() => {
        setIndex((prev) => clampIndex(prev - 1, items.length));
    }, [items.length]);

    const handleNext = useCallback(() => {
        setIndex((prev) => clampIndex(prev + 1, items.length));
    }, [items.length]);

    return (
        <Modal defaultOpen={defaultOpen}>
            <Modal.Trigger asChild onClick={resetToFirst}>
                <span className="inline-flex">{trigger ?? <DefaultTrigger />}</span>
            </Modal.Trigger>

            <Modal.Portal>
                <Modal.Overlay />
                <Modal.Content
                    size="sm"
                    padding="none"
                    className={cn("w-fit max-w-none inline-flex rounded-xl p-4", className)}
                >
                    <div className={cn(frameVariants({ size }))}>
                        <Media gifSrc={current.gifSrc} size={size} />
                        <TextBlock title={current.title} description={current.description} size={size} />
                        <Footer
                            size={size}
                            total={items.length}
                            index={safeIndex}
                            hasPrev={hasPrev}
                            hasNext={hasNext}
                            onPrev={handlePrev}
                            onNext={handleNext}
                        />
                    </div>
                </Modal.Content>
            </Modal.Portal>
        </Modal>
    );
}

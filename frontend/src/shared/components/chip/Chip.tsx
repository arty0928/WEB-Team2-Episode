import { cva, VariantProps } from "class-variance-authority";
import { ComponentPropsWithoutRef, ReactNode } from "react";

import { COLOR_SET, INTERACTIVE_STYLES } from "@/shared/styles/colorSet";
import { cn } from "@/utils/cn";

type AllowedElementType = "button" | "span";

type Props<T extends AllowedElementType> = ComponentPropsWithoutRef<T> &
    VariantProps<typeof variants> & {
        as?: T;
        leftSlot?: ReactNode;
    };

const Chip = <T extends AllowedElementType = "button">({
    variant = "primary",
    size = "md",
    interactive = false,
    leftSlot,
    className,
    children,
    as,
    ...rest
}: Props<T>) => {
    const Component = as ? as : "button";

    return (
        <Component className={cn(variants({ variant, size, interactive }), "min-w-0", className)} {...rest}>
            {leftSlot && <span className="shrink-0">{leftSlot}</span>}

            <span className="truncate block w-full">{children}</span>
        </Component>
    );
};

export default Chip;

const variants = cva("min-w-0 truncate rounded-4xl flex flex-row items-center transition-colors whitespace-nowrap", {
    variants: {
        variant: COLOR_SET,
        size: {
            md: "typo-caption-14-medium py-2 px-3 h-9 gap-2",
            sm: "typo-caption-12-medium py-1 px-2.5 h-6 gap-1",
        },
        interactive: {
            true: "cursor-pointer",
            false: "cursor-default",
        },
    },
    compoundVariants: [
        { variant: "primary", interactive: true, className: INTERACTIVE_STYLES.primary },
        { variant: "secondary", interactive: true, className: INTERACTIVE_STYLES.secondary },
        { variant: "tertiary", interactive: true, className: INTERACTIVE_STYLES.tertiary },
        { variant: "tertiary_outlined", interactive: true, className: INTERACTIVE_STYLES.tertiary_outlined },
        { variant: "quaternary", interactive: true, className: INTERACTIVE_STYLES.quaternary },
        { variant: "quaternary_outlined", interactive: true, className: INTERACTIVE_STYLES.quaternary_outlined },
        {
            variant: "quaternary_accent_outlined",
            interactive: true,
            className: INTERACTIVE_STYLES.quaternary_accent_outlined,
        },
        { variant: "basic", interactive: true, className: INTERACTIVE_STYLES.basic },
        { variant: "notification", interactive: true, className: INTERACTIVE_STYLES.notification },
        { variant: "alert", interactive: true, className: INTERACTIVE_STYLES.alert },
    ],
});

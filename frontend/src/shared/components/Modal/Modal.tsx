import { cva, type VariantProps } from "class-variance-authority";
import {
    cloneElement,
    ComponentPropsWithoutRef,
    createContext,
    isValidElement,
    ReactElement,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { createPortal } from "react-dom";

import { MOUSE_DOWN } from "@/constants/mouse";
import Icon from "@/shared/components/icon/Icon";
import { cn } from "@/utils/cn";

type ModalContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    close: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("모달의 하위 컴포넌트들은 <Modal> 안에서 사용되어야 합니다.");
    }
    return context;
}

export type ModalProps = {
    children: ReactNode;
    defaultOpen?: boolean;
};

function ModalRoot({ children, defaultOpen = false }: ModalProps) {
    const [open, setOpen] = useState(defaultOpen);

    const close = useCallback(() => setOpen(false), []);

    useEffect(() => {
        if (!open) return;
        if (typeof document === "undefined") return;

        // 배경 스크롤 잠금
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };

        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, close]);

    return <ModalContext.Provider value={{ open, setOpen, close }}>{children}</ModalContext.Provider>;
}

function ModalPortal({ children, className }: { children: ReactNode; className?: string }) {
    const { open } = useModalContext();

    if (!open) return null;
    if (typeof document === "undefined") return null;

    const root = document.getElementById("portal_root") ?? document.body;

    return createPortal(<div className={cn("fixed inset-0 z-50", className)}>{children}</div>, root);
}

function ModalOverlay({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
    const { open, close } = useModalContext();

    if (!open) return null;

    return (
        <div
            className={cn("fixed inset-0 bg-black/40", className)}
            onPointerDown={(e) => {
                if (e.button === MOUSE_DOWN.left) {
                    close();
                }

                rest.onPointerDown?.(e);
            }}
            {...rest}
        />
    );
}

const contentVariants = cva(
    "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white rounded-2xl shadow-[0_0_15px_0_rgba(43,46,67,0.15)] outline-none max-h-[calc(100vh-2rem)] overflow-auto",
    {
        variants: {
            size: {
                sm: "w-full max-w-sm",
                md: "w-full max-w-lg",
                lg: "w-full max-w-2xl",
                xl: "w-full max-w-4xl",
            },
            padding: {
                none: "p-0",
                md: "p-8",
                lg: "p-10",
            },
        },
        defaultVariants: {
            size: "md",
            padding: "lg",
        },
    },
);

type ModalContentProps = ComponentPropsWithoutRef<"div"> & VariantProps<typeof contentVariants>;

function ModalContent({ className, size, padding, ...rest }: ModalContentProps) {
    const { open } = useModalContext();

    if (!open) return null;

    return <div className={cn(contentVariants({ size, padding }), className)} {...rest} />;
}

const headerVariants = cva("w-full", {
    variants: {
        align: {
            left: "flex items-start justify-between gap-4",
            center: "flex flex-col items-center text-center gap-4",
        },
    },
    defaultVariants: {
        align: "left",
    },
});

function ModalHeader({
    className,
    align,
    ...rest
}: ComponentPropsWithoutRef<"div"> & VariantProps<typeof headerVariants>) {
    return <div className={cn(headerVariants({ align }), className)} {...rest} />;
}

function ModalBody({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
    return <div className={cn("mt-6 w-full", className)} {...rest} />;
}

function ModalTitle({ className, ...rest }: ComponentPropsWithoutRef<"h2">) {
    return <h2 className={cn("typo-title-20-bold text-text-main1", className)} {...rest} />;
}

type ModalTriggerProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
    asChild?: boolean;
    children: ReactNode;
};

function ModalTrigger({ asChild = true, children, onClick, ...rest }: ModalTriggerProps) {
    const { setOpen } = useModalContext();

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        setOpen(true);
        onClick?.(e as React.MouseEvent<HTMLButtonElement>);
    };

    const triggerProps = {
        ...rest,
        onClick: handleClick,
    };

    if (asChild && isValidElement(children)) {
        const child = children as ReactElement<React.HTMLAttributes<HTMLElement>>;
        return cloneElement(child, {
            ...triggerProps,
            ...child.props,
            onClick: (e: React.MouseEvent<HTMLElement>) => {
                handleClick(e);
                child.props.onClick?.(e);
            },
        });
    }

    return <button {...triggerProps}>{children}</button>;
}

function ModalCloseIcon({ className, onClick, ...rest }: ComponentPropsWithoutRef<"button">) {
    const { close } = useModalContext();

    return (
        <button
            className={cn("p-2 text-gray-400 hover:text-gray-600 active:scale-[0.97]", className)}
            onClick={(e) => {
                close();
                onClick?.(e);
            }}
            {...rest}
        >
            <Icon name="ic_x" size={24} />
        </button>
    );
}

const Modal = Object.assign(ModalRoot, {
    Portal: ModalPortal,
    Overlay: ModalOverlay,
    Content: ModalContent,
    Header: ModalHeader,
    Body: ModalBody,
    Title: ModalTitle,
    Trigger: ModalTrigger,
    CloseIcon: ModalCloseIcon,
});

export default Modal;

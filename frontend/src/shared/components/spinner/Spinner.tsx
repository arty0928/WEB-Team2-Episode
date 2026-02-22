import { ReactNode } from "react";

import { cn } from "@/utils/cn";

type Props = {
    contents?: ReactNode;
    imageSrc?: string;
    fullPage?: boolean;
};

const Spinner = ({ contents = "데이터를 불러오는 중...", imageSrc = "/spinner.webp", fullPage = true }: Props) => {
    return (
        <div className={cn("flex flex-col items-center justify-center w-full gap-4", fullPage ? "h-screen" : "h-full")}>
            <div className="relative">
                <img src={imageSrc} alt="Loading..." className="h-40 w-40 object-contain" />
            </div>
            <span className="text-gray-600 font-medium">{contents}</span>
        </div>
    );
};

export default Spinner;

import { cn } from "@/utils/cn";

interface EpisodeItemHeadProps {
    startDate: string;
    endDate: string;
    episodeTitle?: string;
    className?: string;
}

/** 에피소드 아이템의 왼쪽 섹션으로, 배지, 활동 기간, 제목을 표시합니다. */
export default function EpisodeItemHead({ startDate, endDate, episodeTitle, className }: EpisodeItemHeadProps) {
    const hasDate = startDate && endDate;
    // 제목이 없거나 빈 문자열일 경우 '-' 처리
    const displayTitle = episodeTitle && episodeTitle.trim() !== "" ? episodeTitle : "-";

    return (
        <div className={cn("flex flex-col w-48 shrink-0 items-start justify-start", className)}>
            <div className="flex flex-col gap-2 items-start">
                <time className="text-text-placeholder typo-caption-12-reg leading-140 tracking-title">
                    {hasDate ? `${startDate} ~ ${endDate}` : "기간없음"}
                </time>
                <h3 className="text-text-main2 typo-title-20-semibold tracking-title break-all text-left">
                    {displayTitle}
                </h3>
            </div>
        </div>
    );
}

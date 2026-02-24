import { format, parseISO } from "date-fns";
import { memo, useCallback, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useFormContext, useWatch } from "react-hook-form";

import { DEFAULT_DATE_SET } from "@/features/episodeArchive/constants/defaultDate";
import type { EpisodeDetailResponse } from "@/features/episodeArchive/types/episode";
import CustomCalendar from "@/shared/components/calendar/CustomCalendar";
import DateInput from "@/shared/components/calendar/DateInput";
import Popover from "@/shared/components/popover/Popover";
import { cn } from "@/utils/cn";

type DateRangeLayout = "vertical" | "sideSheetRow";

type Props = {
    className?: string;
    layout?: DateRangeLayout;
};

function EpisodeDateRangeSectionComponent({ className, layout = "vertical" }: Props) {
    const { control, register, setValue } = useFormContext<EpisodeDetailResponse>();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const [startDate, endDate] = useWatch({
        control,
        name: ["startDate", "endDate"],
    });

    const openCalendar = useCallback(() => setIsCalendarOpen(true), []);

    const getDisplayDate = useCallback((dateStr?: string) => {
        if (!dateStr || dateStr === DEFAULT_DATE_SET) return "";
        try {
            return format(parseISO(dateStr), "yyyy. MM. dd");
        } catch {
            return dateStr;
        }
    }, []);

    const selectedRange = useMemo(
        () => ({
            from: startDate && startDate !== DEFAULT_DATE_SET ? parseISO(startDate) : undefined,
            to: endDate && endDate !== DEFAULT_DATE_SET ? parseISO(endDate) : undefined,
        }),
        [startDate, endDate],
    );

    const handleSelect = useCallback(
        (range: DateRange | undefined) => {
            const formattedStart = range?.from ? format(range.from, "yyyy-MM-dd") : DEFAULT_DATE_SET;
            const formattedEnd = range?.to ? format(range.to, "yyyy-MM-dd") : DEFAULT_DATE_SET;

            setValue("startDate", formattedStart, { shouldDirty: true });
            setValue("endDate", formattedEnd, { shouldDirty: true });
        },
        [setValue],
    );

    const calendarContents = (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <CustomCalendar selectedRange={selectedRange} onSelect={handleSelect} />
        </div>
    );

    return (
        <div className={cn("flex flex-col gap-3 w-full overflow-visible", className)}>
            <label className="typo-body-16-semibold text-text-main1">진행 기간</label>

            {layout === "sideSheetRow" ? (
                <div className="grid grid-cols-2 gap-2 w-full overflow-visible">
                    {/* 시작일: Popover 밖에 두되, 클릭하면 종료일 트리거 Popover가 열리게(앵커는 항상 종료일) */}
                    <div className="w-full">
                        <DateInput
                            isSide={true}
                            registration={register("startDate")}
                            value={getDisplayDate(startDate)}
                            placeholder="연도. 월. 일."
                            onClick={openCalendar}
                        />
                    </div>

                    {/* 종료일: Popover 트리거(앵커). 클릭 위치가 어디든 종료일 아래로 뜨게 하기 위해 종료일만 Popover children으로 둠 */}
                    <Popover
                        isOpen={isCalendarOpen}
                        isOnOpenChange={setIsCalendarOpen}
                        direction="bottom_right"
                        wrapperClassName="w-full"
                        contents={calendarContents}
                    >
                        <div className="w-full">
                            <DateInput
                                isSide={true}
                                registration={register("endDate")}
                                value={getDisplayDate(endDate)}
                                placeholder="연도. 월. 일."
                                onClick={openCalendar}
                            />
                        </div>
                    </Popover>
                </div>
            ) : (
                <Popover
                    isOpen={isCalendarOpen}
                    isOnOpenChange={setIsCalendarOpen}
                    direction="bottom_right"
                    wrapperClassName="w-full"
                    contents={calendarContents}
                >
                    <div className="flex flex-col items-center gap-2 w-full">
                        <DateInput
                            registration={register("startDate")}
                            value={getDisplayDate(startDate)}
                            placeholder="연도. 월. 일."
                            onClick={openCalendar}
                        />
                        <span className="typo-body-14-reg text-text-placeholder">~</span>
                        <DateInput
                            registration={register("endDate")}
                            value={getDisplayDate(endDate)}
                            placeholder="연도. 월. 일."
                            onClick={openCalendar}
                        />
                    </div>
                </Popover>
            )}
        </div>
    );
}

const EpisodeDateRangeSection = memo(EpisodeDateRangeSectionComponent);
export default EpisodeDateRangeSection;

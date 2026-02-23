import Chip from "@/shared/components/chip/Chip";

type Props = {
    classname?: string;
};

export default function EpisodeGuide({ classname }: Props) {
    return (
        <>
            <Chip as="span" variant="basic" className={classname} size="sm">
                팀 마인드맵에서 작성한 에피소드는 공유되지 않아요.
            </Chip>
        </>
    );
}

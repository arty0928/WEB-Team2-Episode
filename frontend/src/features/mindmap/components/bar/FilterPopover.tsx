import Button from "@/shared/components/button/Button";
import Card from "@/shared/components/card/Card";
import Chip from "@/shared/components/chip/Chip";
import { ALL_COMPETENCIES, SKILLS_FROM_COMPETENCY } from "@/shared/constants/competency";

export type Skill = (typeof ALL_COMPETENCIES)[number]["competencyType"];

type Props = {
    selectedSkills: Skill[];
    onSkillClick: (skill: Skill) => void;
    onReset: () => void;
    onConfirm: () => void;
};

export default function FilterPopover({ selectedSkills, onSkillClick, onReset, onConfirm }: Props) {
    return (
        <Card
            outlined={false}
            hoverable={false}
            className="w-110 p-5 gap-7 shadow-lg bg-base-white"
            contents={
                <div className="flex flex-wrap gap-2">
                    {SKILLS_FROM_COMPETENCY.map((skill) => (
                        <Chip
                            key={skill}
                            variant={selectedSkills.includes(skill) ? "tertiary_outlined" : "quaternary_outlined"}
                            onClick={() => onSkillClick(skill)}
                        >
                            {skill}
                        </Chip>
                    ))}
                </div>
            }
            footer={
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="xs"
                        borderRadius="lg"
                        onClick={onReset}
                        className="bg-gray-100 text-text-main2"
                    >
                        선택 초기화
                    </Button>
                    <Button variant="primary" size="xs" borderRadius="lg" onClick={onConfirm} className="px-7">
                        확인
                    </Button>
                </div>
            }
        />
    );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";

import Button from "@/shared/components/button/Button";
import Divider from "@/shared/components/divider/Divider";
import Icon from "@/shared/components/icon/Icon";
import Input from "@/shared/components/Input/Input";
import Modal from "@/shared/components/Modal/Modal";
import ProfileIcon from "@/shared/components/profile_icon/ProfileIcon";

type Props = {
    collaborators: string[];
};

export function TeamMindmapShareModal({ collaborators }: Props) {
    const [currentUrl, setCurrentUrl] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            setCurrentUrl(window.location.href);
        }
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(currentUrl);
            toast.success("링크가 복사되었습니다.");
        } catch (err) {
            console.error("복사 실패:", err);
            // toast.error("복사에 실패했습니다."); // 필요 시 추가
        }
    };

    return (
        <Modal>
            <Modal.Trigger>
                <Button
                    leftSlot={<Icon name={"ic_share"} />}
                    borderRadius="lg"
                    variant="quaternary_accent_outlined"
                    size="xs"
                >
                    공유하기
                </Button>
            </Modal.Trigger>

            <Modal.Portal>
                <Modal.Overlay />

                <Modal.Content size="xl" padding="none" className="overflow-hidden p-5">
                    <Modal.Header align="left">
                        <Modal.Title>팀 마인드맵 공유</Modal.Title>
                        <Modal.CloseIcon />
                    </Modal.Header>

                    <Modal.Body className="">
                        <section className="rounded-2xl bg-gray-100 py-3.75 px-5.75">
                            <h3 className="typo-body-18-semibold text-text-main1">링크 액세스</h3>
                            <p className="typo-body-14-reg text-text-main2 mt-2">
                                링크가 있는 누구나 내용을 볼 수 있고 로그인 시 편집할 수 있어요.
                            </p>

                            <Divider direction="x" className="my-4" />

                            <div className="flex items-center gap-3">
                                <Input value={currentUrl} readOnly isFullWidth inputSize="sm" />

                                <Button
                                    variant="primary"
                                    size="sm"
                                    layout="fit"
                                    borderRadius="lg"
                                    leftSlot={<Icon name="ic_copy" size={18} />}
                                    onClick={handleCopy}
                                    className="shrink-0"
                                >
                                    링크 복사
                                </Button>
                            </div>
                        </section>

                        <section className="flex flex-col gap-4 mt-7.5">
                            <h3 className="typo-body-18-semibold text-text-main1">공동 작업자</h3>
                            <ul className="flex flex-col gap-3">
                                {collaborators.map((c, i) => (
                                    <li key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <ProfileIcon name={c} />
                                            <span className="typo-body-16-medium text-text-main1 truncate">{c}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </Modal.Body>
                </Modal.Content>
            </Modal.Portal>
        </Modal>
    );
}

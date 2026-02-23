import { nodeVariants } from "@/features/mindmap/node/components/node/Node";
import { DefinedVariantProps } from "@/shared/types/safeVariantProps";

export type NodeVariant = "idle" | "interactive" | "highlighted";

export type NodeSize = DefinedVariantProps<typeof nodeVariants>["size"];

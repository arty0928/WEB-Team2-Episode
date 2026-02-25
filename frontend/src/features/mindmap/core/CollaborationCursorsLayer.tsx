import { useMindmapRemoteCursors } from "@/features/mindmap/hooks/useMindmapStoreState";

export default function CollaborationCursorsLayer() {
    const cursors = useMindmapRemoteCursors();

    if (!cursors || cursors.length === 0) return null;

    return (
        <g className="remote-cursors pointer-events-none">
            {cursors.map((c) => (
                <g key={c.clientId} transform={`translate(${c.cursor.x}, ${c.cursor.y})`}>
                    <circle r={6} fill={c.user.color} opacity={0.9} />
                    <circle r={10} fill="transparent" stroke={c.user.color} strokeWidth={2} opacity={0.6} />

                    <foreignObject x={12} y={10} width={200} height={40}>
                        <div
                            style={{
                                maxWidth: "100px",
                                display: "inline-block",
                                backgroundColor: c.user.color,
                                color: "#fff",
                                fontSize: "12px",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                opacity: 0.85,

                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                verticalAlign: "middle",
                            }}
                        >
                            {c.user.name}
                        </div>
                    </foreignObject>
                </g>
            ))}
        </g>
    );
}

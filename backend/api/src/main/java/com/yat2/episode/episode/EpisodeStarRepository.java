package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.mindmap.dto.MindmapCompetencyRow;

@Repository
public interface EpisodeStarRepository extends JpaRepository<EpisodeStar, EpisodeId> {
    @Query(
            """
                        SELECT s
                        FROM EpisodeStar s
                        JOIN FETCH s.episode e
                        LEFT JOIN FETCH s.competencyTypeIds
                        WHERE s.id.nodeId = :nodeId
                          AND s.id.participantId = :participantId
                    """
    )
    Optional<EpisodeStar> findStarDetail(
            @Param("nodeId") UUID nodeId,
            @Param("participantId") int participantId
    );

    @Query(
            """
                        SELECT DISTINCT ctId
                        FROM EpisodeStar es
                        JOIN es.episode e
                        JOIN es.competencyTypeIds ctId
                        WHERE e.mindmapId = :mindmapId
                        AND es.id.participantId = :participantId
                    """
    )
    List<Integer> findCompetencyTypesByMindmapId(
            @Param("mindmapId") UUID mindmapId,
            @Param("participantId") int participantId
    );

    @Query(
            """
                    SELECT DISTINCT s
                    FROM EpisodeStar s
                    JOIN FETCH s.episode e
                    LEFT JOIN FETCH s.competencyTypeIds ctId
                    WHERE s.id.participantId IN :participantIds
                      AND e.mindmapId IN :mindmapIds
                      AND (
                        :keyword IS NULL OR :keyword = '' OR
                        e.content LIKE %:keyword% OR
                        s.situation LIKE %:keyword% OR
                        s.task LIKE %:keyword% OR
                        s.action LIKE %:keyword% OR
                        s.result LIKE %:keyword%
                      )
                    ORDER BY s.createdAt DESC
                    """
    )
    List<EpisodeStar> searchEpisodes(
            @Param("participantIds") List<Integer> participantIds,
            @Param("mindmapIds") List<UUID> mindmapIds,
            @Param("keyword") String keyword
    );

    @Query(
            """
                    SELECT DISTINCT new com.yat2.episode.mindmap.dto.MindmapCompetencyRow(e.mindmapId, ctId)
                    FROM EpisodeStar es
                    JOIN es.episode e
                    JOIN es.competencyTypeIds ctId
                    WHERE e.mindmapId IN :mindmapIds
                      AND es.id.participantId IN :participantIds
                    """
    )
    List<MindmapCompetencyRow> findCompetencyTypesByMindmapIds(
            @Param("mindmapIds") List<UUID> mindmapIds,
            @Param("participantIds") List<Integer> participantIds
    );

    @Query(
            """
                    SELECT s.id.nodeId
                    FROM EpisodeStar s
                    WHERE s.id.participantId = :participantId
                      AND s.id.nodeId IN :nodeIds
                    """
    )
    List<UUID> findNodeIdsByParticipantIdAndNodeIdIn(
            @Param("participantId") int participantId,
            @Param("nodeIds") List<UUID> nodeIds
    );

    @Query(
            """
                        SELECT s.id.nodeId
                        FROM EpisodeStar s
                        JOIN MindmapParticipant mp
                          ON mp.id = s.id.participantId
                        WHERE mp.user.id = :userId
                          AND s.id.nodeId IN :nodeIds
                    """
    )
    List<UUID> findAccessibleNodeIdsByUserIdAndNodeIds(
            @Param("userId") long userId,
            @Param("nodeIds") List<UUID> nodeIds
    );
}

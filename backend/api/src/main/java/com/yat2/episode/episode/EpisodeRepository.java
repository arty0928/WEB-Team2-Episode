package com.yat2.episode.episode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.yat2.episode.episode.dto.response.EpisodeSummaryRes;

@Repository
public interface EpisodeRepository extends JpaRepository<Episode, UUID> {
    @Query("SELECT e.id FROM Episode e WHERE e.mindmapId = :mindmapId")
    List<UUID> findNodeIdsByMindmapId(
            @Param("mindmapId") UUID mindmapId
    );

    @Query(
            """
                    SELECT new com.yat2.episode.episode.dto.response.EpisodeSummaryRes(
                        e.id,
                        e.mindmapId,
                        e.content,
                        s.startDate,
                        s.endDate
                    )
                    FROM EpisodeStar s
                    JOIN s.episode e
                    WHERE e.mindmapId = :mindmapId
                      AND s.id.participantId = :participantId
                    """
    )
    List<EpisodeSummaryRes> findSummariesByMindmapIdAndParticipantId(
            @Param("mindmapId") UUID mindmapId,
            @Param("participantId") int participantId
    );

    @Query("SELECT e.mindmapId FROM Episode e WHERE e.id = :nodeId")
    Optional<UUID> findMindmapIdByNodeId(
            @Param("nodeId") UUID nodeId
    );
}

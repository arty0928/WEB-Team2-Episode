/*
  목표:
  - episode_stars / episode_star_competency_types 에 participant_id 추가 및 백필
  - participant 없는 star(떠있는 star) 데이터는 삭제
  - participant 삭제 시 star 자동 삭제를 위해 FK(participant_id) ON DELETE CASCADE 추가
  - 기존 (node_id, user_id) PK/컬럼은 유지 (호환성)
*/

ALTER TABLE episode_stars
  ADD COLUMN participant_id INT NULL;

ALTER TABLE episode_star_competency_types
  ADD COLUMN participant_id INT NULL;

DELETE es
FROM episode_stars es
JOIN episodes e ON e.node_id = es.node_id
LEFT JOIN mindmap_participants mp
  ON mp.user_id = es.user_id
 AND mp.mindmap_id = e.mindmap_id
WHERE mp.id IS NULL;

DELETE esct
FROM episode_star_competency_types esct
LEFT JOIN episode_stars es
  ON es.node_id = esct.node_id AND es.user_id = esct.user_id
WHERE es.node_id IS NULL;

UPDATE episode_stars es
JOIN episodes e ON e.node_id = es.node_id
JOIN mindmap_participants mp
  ON mp.user_id = es.user_id
 AND mp.mindmap_id = e.mindmap_id
SET es.participant_id = mp.id
WHERE es.participant_id IS NULL;

UPDATE episode_star_competency_types esct
JOIN episode_stars es
  ON es.node_id = esct.node_id AND es.user_id = esct.user_id
SET esct.participant_id = es.participant_id
WHERE esct.participant_id IS NULL;

DELETE FROM episode_star_competency_types
WHERE participant_id IS NULL;

DELETE FROM episode_stars
WHERE participant_id IS NULL;

CREATE INDEX idx_episode_stars_participant_id
  ON episode_stars (participant_id);

CREATE INDEX idx_esct_participant_id
  ON episode_star_competency_types (participant_id);

ALTER TABLE episode_stars
  ADD UNIQUE KEY uk_es_node_participant (node_id, participant_id);

ALTER TABLE episode_star_competency_types
  ADD UNIQUE KEY uk_esct_node_participant_comp (node_id, participant_id, competency_type_id);

ALTER TABLE episode_stars
  MODIFY participant_id INT NOT NULL;

ALTER TABLE episode_star_competency_types
  MODIFY participant_id INT NOT NULL;

ALTER TABLE episode_stars
  ADD CONSTRAINT fk_es_participant
  FOREIGN KEY (participant_id)
  REFERENCES mindmap_participants (id)
  ON DELETE CASCADE;

ALTER TABLE episode_star_competency_types
  ADD CONSTRAINT fk_esct_participant
  FOREIGN KEY (participant_id)
  REFERENCES mindmap_participants (id)
  ON DELETE CASCADE;

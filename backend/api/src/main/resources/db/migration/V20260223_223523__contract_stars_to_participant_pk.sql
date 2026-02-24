ALTER TABLE episode_star_competency_types
  DROP FOREIGN KEY fk_esct_star;

ALTER TABLE episode_stars
  DROP FOREIGN KEY episode2user;

DROP INDEX ix_episode_stars_user_created_node ON episode_stars;

ALTER TABLE episode_star_competency_types
  DROP INDEX uk_esct_node_participant_comp;

ALTER TABLE episode_stars
  DROP INDEX uk_es_node_participant;


ALTER TABLE episode_stars
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (node_id, participant_id);

ALTER TABLE episode_star_competency_types
  ADD CONSTRAINT fk_esct_star2
  FOREIGN KEY (node_id, participant_id)
  REFERENCES episode_stars (node_id, participant_id)
  ON DELETE CASCADE;

ALTER TABLE episode_star_competency_types
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (node_id, participant_id, competency_type_id);

ALTER TABLE episode_star_competency_types
  DROP COLUMN user_id;

ALTER TABLE episode_stars
  DROP COLUMN user_id;

CREATE INDEX idx_episode_stars_participant_created_node
  ON episode_stars (participant_id ASC, created_at DESC, node_id ASC);


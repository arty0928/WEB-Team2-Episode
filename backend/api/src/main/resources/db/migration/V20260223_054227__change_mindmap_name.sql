UPDATE mindmaps
SET name = LEFT(name, 20)
WHERE CHAR_LENGTH(name) > 20;

ALTER TABLE mindmaps MODIFY COLUMN name VARCHAR(20);

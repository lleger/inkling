-- Note → note references for wiki-links. Populated on every note save by
-- parsing `[[<id>|<title>]]` out of the markdown content.
--
-- Backlinks query: SELECT note_id FROM note_refs WHERE ref_id = :id AND user_id = :userId

CREATE TABLE IF NOT EXISTS note_refs (
  note_id TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (note_id, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_refs_note ON note_refs(note_id);
CREATE INDEX IF NOT EXISTS idx_refs_target_user ON note_refs(ref_id, user_id);

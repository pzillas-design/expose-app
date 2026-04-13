-- Add folder_id to images for explicit, immutable stack grouping.
-- Replaces runtime parentId chain-walking (O(n²)) with a single indexed column (O(1)).
--
-- folder_id = the ID of the root (original/uploaded) image in a stack.
-- All generated variants share the same folder_id as their root.

ALTER TABLE images ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Backfill: recursive CTE walks up the parent_id chain to find each image's root.
WITH RECURSIVE ancestry AS (
    -- Base case: root images have no parent — they are their own folder root.
    SELECT id, id AS folder_id
    FROM images
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: children inherit the folder_id of their parent's root.
    SELECT i.id, a.folder_id
    FROM images i
    INNER JOIN ancestry a ON i.parent_id = a.id
)
UPDATE images
SET folder_id = ancestry.folder_id
FROM ancestry
WHERE images.id = ancestry.id;

-- Fallback: images whose parent chain is broken (parent was deleted) become their own root.
UPDATE images
SET folder_id = id
WHERE folder_id IS NULL;

-- Index for fast GROUP BY / WHERE folder_id = ? queries.
CREATE INDEX IF NOT EXISTS images_folder_id_idx ON images(folder_id);

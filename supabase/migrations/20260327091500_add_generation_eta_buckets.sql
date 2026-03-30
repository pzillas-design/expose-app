ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS request_type TEXT,
  ADD COLUMN IF NOT EXISTS has_source_image BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_mask BOOLEAN,
  ADD COLUMN IF NOT EXISTS reference_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_size TEXT;

DROP FUNCTION IF EXISTS get_smart_generation_estimates();

CREATE OR REPLACE FUNCTION get_smart_generation_estimates()
RETURNS TABLE(
    estimate_key TEXT,
    quality_mode TEXT,
    request_type TEXT,
    has_source_image BOOLEAN,
    has_mask BOOLEAN,
    has_references BOOLEAN,
    image_size TEXT,
    base_duration_ms NUMERIC,
    concurrency_factor NUMERIC,
    sample_count BIGINT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH recent_jobs AS (
    SELECT
      gj.quality_mode,
      COALESCE(NULLIF(gj.request_type, ''), CASE WHEN COALESCE(gj.has_source_image, false) THEN 'edit' ELSE 'create' END) AS request_type,
      COALESCE(gj.has_source_image, false) AS has_source_image,
      COALESCE(gj.has_mask, false) AS has_mask,
      COALESCE(gj.reference_count, 0) > 0 AS has_references,
      COALESCE(
        NULLIF(gj.image_size, ''),
        CASE
          WHEN gj.quality_mode ILIKE '%4k%' THEN '4K'
          WHEN gj.quality_mode ILIKE '%2k%' THEN '2K'
          ELSE '1K'
        END
      ) AS image_size,
      gj.duration_ms,
      gj.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY
          gj.quality_mode,
          COALESCE(NULLIF(gj.request_type, ''), CASE WHEN COALESCE(gj.has_source_image, false) THEN 'edit' ELSE 'create' END),
          COALESCE(gj.has_source_image, false),
          COALESCE(gj.has_mask, false),
          COALESCE(gj.reference_count, 0) > 0,
          COALESCE(
            NULLIF(gj.image_size, ''),
            CASE
              WHEN gj.quality_mode ILIKE '%4k%' THEN '4K'
              WHEN gj.quality_mode ILIKE '%2k%' THEN '2K'
              ELSE '1K'
            END
          )
        ORDER BY gj.created_at DESC
      ) AS rn
    FROM public.generation_jobs gj
    WHERE gj.status = 'completed'
      AND gj.quality_mode IS NOT NULL
      AND gj.duration_ms IS NOT NULL
      AND gj.duration_ms > 0
      AND gj.duration_ms < 300000
      AND gj.created_at > NOW() - INTERVAL '14 days'
  ),
  bucketed AS (
    SELECT
      quality_mode,
      request_type,
      has_source_image,
      has_mask,
      has_references,
      image_size,
      AVG(duration_ms)::NUMERIC AS avg_duration_ms,
      COUNT(*)::BIGINT AS cnt
    FROM recent_jobs
    WHERE rn <= 10
    GROUP BY quality_mode, request_type, has_source_image, has_mask, has_references, image_size
  ),
  defaults AS (
    SELECT *
    FROM (
      VALUES
        ('nb2-1k', 'create', false, false, false, '1K', 15000::NUMERIC),
        ('nb2-1k', 'create', false, false, true,  '1K', 18000::NUMERIC),
        ('nb2-1k', 'edit',   true,  false, false, '1K', 18000::NUMERIC),
        ('nb2-1k', 'edit',   true,  false, true,  '1K', 22000::NUMERIC),
        ('nb2-1k', 'edit',   true,  true,  false, '1K', 24000::NUMERIC),
        ('nb2-1k', 'edit',   true,  true,  true,  '1K', 28000::NUMERIC),
        ('nb2-2k', 'create', false, false, false, '2K', 25000::NUMERIC),
        ('nb2-2k', 'create', false, false, true,  '2K', 29000::NUMERIC),
        ('nb2-2k', 'edit',   true,  false, false, '2K', 30000::NUMERIC),
        ('nb2-2k', 'edit',   true,  false, true,  '2K', 36000::NUMERIC),
        ('nb2-2k', 'edit',   true,  true,  false, '2K', 39000::NUMERIC),
        ('nb2-2k', 'edit',   true,  true,  true,  '2K', 45000::NUMERIC),
        ('nb2-4k', 'create', false, false, false, '4K', 45000::NUMERIC),
        ('nb2-4k', 'create', false, false, true,  '4K', 52000::NUMERIC),
        ('nb2-4k', 'edit',   true,  false, false, '4K', 62000::NUMERIC),
        ('nb2-4k', 'edit',   true,  false, true,  '4K', 76000::NUMERIC),
        ('nb2-4k', 'edit',   true,  true,  false, '4K', 84000::NUMERIC),
        ('nb2-4k', 'edit',   true,  true,  true,  '4K', 95000::NUMERIC)
    ) AS d(quality_mode, request_type, has_source_image, has_mask, has_references, image_size, duration_ms)
  )
  SELECT
    CONCAT_WS('|', d.quality_mode, d.request_type, d.has_source_image::TEXT, d.has_mask::TEXT, d.has_references::TEXT, d.image_size) AS estimate_key,
    d.quality_mode,
    d.request_type,
    d.has_source_image,
    d.has_mask,
    d.has_references,
    d.image_size,
    COALESCE(b.avg_duration_ms, d.duration_ms) AS base_duration_ms,
    0.3::NUMERIC AS concurrency_factor,
    COALESCE(b.cnt, 0::BIGINT) AS sample_count
  FROM defaults d
  LEFT JOIN bucketed b
    ON b.quality_mode = d.quality_mode
   AND b.request_type = d.request_type
   AND b.has_source_image = d.has_source_image
   AND b.has_mask = d.has_mask
   AND b.has_references = d.has_references
   AND b.image_size = d.image_size;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_smart_generation_estimates() TO authenticated;

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// 최종 과제: 이미 같은 originalUrl(또는 같은 shortCode)이 저장되어 있으면
// 오류를 내지 않고 그대로 둡니다. (ON CONFLICT DO NOTHING)
export async function saveUrl(shortCode, originalUrl) {
  await sql`
    INSERT INTO urls (short_code, original_url)
    VALUES (${shortCode}, ${originalUrl})
    ON CONFLICT DO NOTHING
  `;
}

export async function findUrlByShortCode(shortCode) {
  const rows = await sql`
    SELECT original_url
    FROM urls
    WHERE short_code = ${shortCode}
    LIMIT 1
  `;
  return rows[0]?.original_url ?? null;
}

// 최종 과제 1: 이미 단축한 URL 인지 확인하고, 있으면 기존 shortCode 를 돌려줍니다.
export async function findShortCodeByOriginalUrl(originalUrl) {
  const rows = await sql`
    SELECT short_code
    FROM urls
    WHERE original_url = ${originalUrl}
    LIMIT 1
  `;
  return rows[0]?.short_code ?? null;
}

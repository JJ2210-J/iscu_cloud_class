import { getOriginalUrl } from "../../lib/cache";
import { recordClick } from "../../lib/stats";

export async function GET(request, { params }) {
  const { shortCode } = await params;

  // 10주차: Redis 를 먼저 보고(Cache Hit 이면 Postgres SELECT 생략), 없을 때만 Postgres 를 조회합니다.
  // 조회와 클릭 기록에 걸린 시간을 나눠 재서 HIT·MISS 를 비교합니다.
  const t0 = performance.now();
  const { originalUrl, cacheStatus } = await getOriginalUrl(shortCode);
  const t1 = performance.now();

  // 5주차: DB에 없는 shortCode면 Redirect 하지 않고 404 Not Found 를 반환합니다.
  if (!originalUrl) {
    // 6주차: 운영자가 Runtime Logs 에서 어떤 shortCode 가 조회되지 않았는지 볼 수 있게 남깁니다.
    console.warn("Short URL not found", { shortCode });

    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  // 6주차: 원본 URL 을 찾은 경우에만 클릭을 기록합니다.
  // 기록이 실패해도 핵심 기능인 Redirect 는 계속 수행합니다.
  try {
    await recordClick(shortCode);
  } catch (error) {
    console.error("Failed to record click", { shortCode });
  }
  const t2 = performance.now();

  console.log({
    shortCode,
    cacheStatus,
    lookupMs: (t1 - t0).toFixed(1),
    updateMs: (t2 - t1).toFixed(1),
    totalMs: (t2 - t0).toFixed(1),
  });

  return new Response(null, {
    status: 307,
    headers: {
      Location: originalUrl,
      "Cache-Control": "no-store",
      // 10주차: 직접 만든 Redis 캐시에서 찾았는지(HIT) 아닌지(MISS). Vercel CDN 캐시와는 다릅니다.
      "X-Cache": cacheStatus,
    },
  });
}

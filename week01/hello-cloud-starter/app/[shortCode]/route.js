import { findUrlByShortCode } from "../../lib/db";
import { recordClick } from "../../lib/stats";

export async function GET(request, { params }) {
  const { shortCode } = await params;

  const originalUrl = await findUrlByShortCode(shortCode);

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

  return new Response(null, {
    status: 307,
    headers: {
      Location: originalUrl,
      "Cache-Control": "no-store",
    },
  });
}

import {
  getSummaryStats,
  getTopUrl,
  getUrlStats,
} from "../../../lib/stats";
import { authenticate } from "../../../lib/auth";
import { authorize } from "../../../lib/authorization";

export const dynamic = "force-dynamic";

// 7주차: 인증 정보가 없거나 틀리면 401 을 돌려줍니다.
function authenticationRequiredResponse() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"',
      "Cache-Control": "no-store",
    },
  });
}

// 7주차: 인증은 됐지만 통계를 읽을 권한이 없으면 403 을 돌려줍니다.
function forbiddenResponse() {
  return new Response("Forbidden", {
    status: 403,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request) {
  // 7주차 TODO 3: 통계를 조회하기 전에 인증과 인가를 먼저 확인합니다.
  const user = authenticate(request);
  if (!user) return authenticationRequiredResponse();
  if (!authorize(user, "stats:read")) return forbiddenResponse();

  try {
    const summary = await getSummaryStats();
    const topUrl = await getTopUrl();
    const urls = await getUrlStats();

    // 6주차 TODO: summary, topUrl, urls 를 하나의 JSON 응답으로 반환합니다.
    return Response.json(
      {
        summary: {
          totalUrls: summary.totalUrls,
          totalClicks: summary.totalClicks,
          clickedUrls: summary.clickedUrls,
          topUrl: topUrl,
        },
        urls: urls,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch (error) {
    console.error("Failed to load stats", error);

    return Response.json(
      {
        error: {
          code: "STATS_ERROR",
          message: "Failed to load stats.",
        },
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

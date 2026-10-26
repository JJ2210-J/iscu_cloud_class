// 최종 과제 2: 이 서비스 자신의 주소를 다시 단축하려는 요청을 막기 위한 판별 함수입니다.
//
// 막아야 하는 이유: 단축 주소가 자기 자신을 가리키면 Redirect 가 서비스 안에서 끝없이 돌거나,
// 의미 없는 주소가 DB 에 쌓입니다.
//
// 기준은 "호스트 이름이 같은가" 입니다. 경로가 있든 없든, http 든 https 든 같은 호스트면 막습니다.

// 호스트 이름을 비교하기 좋게 통일합니다. (소문자, 끝의 점 제거, 포트 제거)
function normalizeHostname(value) {
  if (!value) {
    return null;
  }

  try {
    const first = String(value).split(",")[0].trim();
    if (first === "") {
      return null;
    }
    // "host" 또는 "host:port" 모두 URL 로 읽어서 hostname 만 꺼냅니다.
    const hostname = new URL(`http://${first.replace(/^https?:\/\//, "")}`).hostname;
    return hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }
}

// 이 서비스가 사용하는 호스트 이름 목록을 모읍니다.
// - 지금 요청이 들어온 주소(request.url, Host 헤더)
// - Vercel 이 알려 주는 배포 주소(VERCEL_URL, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_BRANCH_URL)
function getOwnHostnames(request) {
  const candidates = [
    new URL(request.url).host,
    request.headers.get("host"),
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
  ];

  const hostnames = new Set();
  for (const candidate of candidates) {
    const hostname = normalizeHostname(candidate);
    if (hostname) {
      hostnames.add(hostname);
    }
  }
  return hostnames;
}

// parsedUrl(new URL 결과)이 이 서비스 자신의 주소인지 알려 줍니다.
export function isOwnServiceUrl(parsedUrl, request) {
  const targetHostname = normalizeHostname(parsedUrl.host);
  if (!targetHostname) {
    return false;
  }
  return getOwnHostnames(request).has(targetHostname);
}

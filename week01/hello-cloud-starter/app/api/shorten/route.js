import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { saveUrl, findShortCodeByOriginalUrl } from "../../../lib/db";
import { isOwnServiceUrl } from "../../../lib/selfUrl";

export const runtime = "nodejs";

const MAX_URL_LENGTH = 2048;

const ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/*
 * createShortCode()
 *
 * 원본 URL을 입력받아 SHA-256 해시를 생성하고,
 * 그 값을 이용해 6자리 short code를 만듭니다.
 */
function createShortCode(originalUrl, length = 6) {
  const hex = createHash("sha256")
    .update(originalUrl)
    .digest("hex");

  let code = "";

  for (let i = 0; i < length; i++) {
    const value = parseInt(
      hex.slice(i * 2, i * 2 + 2),
      16
    );

    code += ALPHABET[value % ALPHABET.length];
  }

  return code;
}

/*
 * POST()
 *
 * 클라이언트가 보낸 URL을 검사하고,
 * 문제가 없으면 short URL을 생성하여 반환합니다.
 */
export async function POST(request) {
  try {

    /*
     * 1. 요청 body 읽기
     *
     * 클라이언트가 보낸 JSON에서
     * originalUrl 값을 가져옵니다.
     */
    const body = await request.json().catch(() => null);

    const raw = body?.originalUrl;
    const originalUrl =
      typeof raw === "string" ? raw.trim() : "";


    /*
     * 2. URL이 입력되지 않은 경우
     *
     * 클라이언트가 필요한 값을 보내지 않은 상황입니다.
     *
     * TODO:
     * 적절한 HTTP status code로 수정하세요.
     */
    if (!originalUrl) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_URL",
            message: "Original URL is required.",
          },
        },
        { status: 400 }
      );
    }


    /*
     * 3. URL이 너무 긴 경우
     *
     * 서버가 허용하는 최대 길이보다
     * 긴 URL을 클라이언트가 보낸 상황입니다.
     *
     * TODO:
     * 적절한 HTTP status code로 수정하세요.
     */
    if (originalUrl.length > MAX_URL_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: "URL_TOO_LONG",
            message:
              `URL must be ${MAX_URL_LENGTH} characters or fewer.`,
          },
        },
        { status: 400 }
      );
    }


    /*
     * 4. URL 형식 검사
     *
     * new URL()을 이용하여
     * 올바른 URL 형식인지 검사합니다.
     */
    let parsedUrl;

    try {
      parsedUrl = new URL(originalUrl);
    } catch {

      /*
       * 올바른 URL 형식이 아닌 경우
       *
       * TODO:
       * 적절한 HTTP status code로 수정하세요.
       */
      return NextResponse.json(
        {
          error: {
            code: "INVALID_URL",
            message:
              "URL must start with http:// or https://.",
          },
        },
        { status: 400 }
      );
    }


    /*
     * 5. 프로토콜 검사
     *
     * http 또는 https만 허용합니다.
     */
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {

      /*
       * 허용하지 않는 URL을 보낸 경우
       *
       * TODO:
       * 적절한 HTTP status code로 수정하세요.
       */
      return NextResponse.json(
        {
          error: {
            code: "INVALID_URL",
            message:
              "URL must start with http:// or https://.",
          },
        },
        { status: 400 }
      );
    }


    /*
     * 6. 자기 서비스 URL 차단 (최종 과제 2)
     *
     * 이 서비스 자신의 주소를 다시 단축하려는 요청입니다.
     * 호스트가 같으면 경로와 http/https 여부에 관계없이 400 으로 막습니다.
     */
    if (isOwnServiceUrl(parsedUrl, request)) {
      return NextResponse.json(
        {
          error: {
            code: "SELF_URL_NOT_ALLOWED",
            message:
              "URLs of this service cannot be shortened.",
          },
        },
        { status: 400 }
      );
    }

    const baseUrl = new URL(request.url).origin;


    /*
     * 7. 동일 URL 중복 처리 (최종 과제 1)
     *
     * 이미 단축한 URL 이면 새로 만들지 않고,
     * 저장되어 있던 기존 shortCode 를 그대로 돌려줍니다.
     * 새로 만든 것이 아니므로 201 대신 200 을 사용합니다.
     */
    const existingCode = await findShortCodeByOriginalUrl(originalUrl);

    if (existingCode) {
      return NextResponse.json(
        {
          shortCode: existingCode,
          shortUrl: `${baseUrl}/${existingCode}`,
          originalUrl,
        },
        { status: 200 }
      );
    }


    /*
     * 8. Short URL 생성
     *
     * 모든 검사를 통과했으므로
     * shortCode와 shortUrl을 생성합니다.
     */
    const shortCode = createShortCode(originalUrl);

    // 4주차: shortCode와 originalUrl의 매핑을 Neon Postgres에 저장합니다.
    // 최종 과제: 거의 동시에 같은 URL 요청이 와도 오류가 나지 않도록 충돌은 그대로 둡니다.
    await saveUrl(shortCode, originalUrl);

    // 실제로 저장된 shortCode 를 다시 읽어 응답합니다.
    // (다른 URL 이 같은 shortCode 를 차지한 경우는 이번 과제 범위 밖이므로 500 으로 알립니다.)
    const storedCode = await findShortCodeByOriginalUrl(originalUrl);

    if (storedCode !== shortCode) {
      throw new Error("Short code was not stored for this URL.");
    }


    /*
     * URL 생성 성공
     */
    return NextResponse.json(
      {
        shortCode,
        shortUrl: `${baseUrl}/${shortCode}`,
        originalUrl,
      },
      { status: 201 }
    );

  } catch {

    /*
     * 7. 서버 내부 오류
     *
     * 예상하지 못한 오류가 발생한 경우입니다.
     *
     * TODO:
     * 적절한 HTTP status code로 수정하세요.
     */
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create short URL.",
        },
      },
      { status: 500 }
    );
  }
}

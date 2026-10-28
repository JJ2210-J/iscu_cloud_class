import "./globals.css";

export const metadata = {
  title: "URL Shortener",
  description: "긴 URL을 짧은 주소로 바꿔 주는 URL Shortener (클라우드컴퓨팅 1~7주차 종합 실습)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

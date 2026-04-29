import './globals.css';

export const metadata = {
  title: 'Threads 영상 답글함',
  description: '영상 달린 Threads 답글만 확인하는 페이지',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

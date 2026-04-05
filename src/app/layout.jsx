import '../App.css';

export const metadata = {
  title: 'LCMS',
  description: 'Local CMS with static site export',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

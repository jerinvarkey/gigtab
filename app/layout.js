import './globals.css';

export const metadata = {
  title: 'GigTab — Track Shifts. Get Paid.',
  description: 'Simple shift tracking and payment management for gig workers and small businesses.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

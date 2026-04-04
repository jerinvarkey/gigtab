import './globals.css';

export const metadata = {
  title: 'GigTab — One link. Every payment method. Get paid instantly.',
  description: 'Stop asking "what\'s your Venmo?" Share one link with all your payment info. Pay people, create events, manage gig work.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#FFFBF5" />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import HomePageClient from './home-page-client';

export function generateMetadata(): Metadata {
  return {
    alternates: {
      canonical: '/',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function HomePage() {
  return <HomePageClient />;
}

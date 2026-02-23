'use client';

import { useState } from 'react';

export function GuideImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={error ? '/guide/placeholder.svg' : src}
      alt={alt}
      className="w-full"
      onError={() => setError(true)}
    />
  );
}

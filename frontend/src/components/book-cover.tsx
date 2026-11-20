"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  title: string;
  coverUrl?: string | null;
  thumbnailUrl?: string | null;
  sizes: string;
  imageClassName?: string;
};

export default function BookCover({
  title,
  coverUrl,
  thumbnailUrl,
  sizes,
  imageClassName = "object-contain",
}: Props) {
  const [attempt, setAttempt] = useState(0);
  const urls = [...new Set(
    [coverUrl, thumbnailUrl].filter(
      (url): url is string => typeof url === "string" && url.length > 0
    )
  )];
  const src = urls[attempt];

  if (!src) {
    return (
      <div
        role="img"
        aria-label={`Cover unavailable for ${title}`}
        className="absolute inset-0 flex items-center justify-center text-[#0D8F91]"
      >
        <svg aria-hidden="true" viewBox="0 0 64 64" fill="none" className="h-16 w-16">
          <path
            d="M32 13C24 9 16 9 7 12v38c9-3 17-3 25 1 8-4 16-4 25-1V12c-9-3-17-3-25 1Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M32 13v38" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`Cover of ${title}`}
      fill
      sizes={sizes}
      className={imageClassName}
      onError={() => setAttempt((current) => current + 1)}
    />
  );
}
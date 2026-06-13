import React from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}

export default function StarRating({ value, onChange, readonly = false, size = 20 }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="stars" style={{ fontSize: size }}>
      {stars.map(s => (
        <span
          key={s}
          className={`star ${s <= value ? 'filled' : ''}`}
          onClick={() => !readonly && onChange?.(s)}
          style={{ cursor: readonly ? 'default' : 'pointer', fontSize: size }}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
}

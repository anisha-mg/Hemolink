import React, { useState, useEffect } from 'react';

export default function StatCounter({ value = 0, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration;
    const stepTime = Math.abs(Math.floor(totalMiliseconds / (end || 1)));

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 20));

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span className="font-mono font-bold tracking-tight">{count}</span>;
}

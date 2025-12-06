"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

type ClientDateTimeProps = {
  date: string | number | Date;
  formatString?: string;
};

export function ClientDateTime({ date, formatString = "dd/MM/yyyy HH:mm" }: ClientDateTimeProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder on the server or during the initial client render
    return null;
  }

  return <>{format(new Date(date), formatString)}</>;
}

import React from 'react';
import { Thermometer, ThermometerSnowflake, ThermometerSun } from 'lucide-react';

export default function StatusBadge({ status }) {
  if (status === 'green') {
    return (
      <span className="status-badge status-green">
        <ThermometerSnowflake size={14} /> Normal
      </span>
    );
  }
  
  if (status === 'amber') {
    return (
      <span className="status-badge status-amber">
        <Thermometer size={14} /> Warning
      </span>
    );
  }

  return (
    <span className="status-badge status-red">
      <ThermometerSun size={14} /> Breach
    </span>
  );
}

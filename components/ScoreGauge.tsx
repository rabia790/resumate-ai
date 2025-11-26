import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  const getColor = (val: number) => {
    if (val >= 80) return '#22c55e'; // Green
    if (val >= 50) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <div className="h-48 w-full flex flex-col items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={180}
            endAngle={0}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell key="score" fill={getColor(score)} cornerRadius={6} />
            <Cell key="remaining" fill="#e2e8f0" />
            <Label
              value={`${score}%`}
              position="center"
              offset={0}
              className="text-3xl font-bold fill-slate-700"
              dy={-10}
            />
            <Label
              value="Match Score"
              position="center"
              offset={0}
              className="text-xs fill-slate-500 font-medium"
              dy={15}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreGauge;
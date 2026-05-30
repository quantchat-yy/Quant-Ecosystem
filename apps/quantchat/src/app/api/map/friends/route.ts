import { NextResponse } from 'next/server';

const FRIENDS_LOCATIONS = [
  { id: '1', name: 'Alex', top: '25%', left: '35%', color: 'bg-emerald-500' },
  { id: '2', name: 'Sam', top: '45%', left: '60%', color: 'bg-indigo-500' },
  { id: '3', name: 'Jordan', top: '60%', left: '25%', color: 'bg-amber-500' },
  { id: '4', name: 'Taylor', top: '35%', left: '75%', color: 'bg-pink-500' },
  { id: '5', name: 'Riley', top: '70%', left: '55%', color: 'bg-purple-500' },
  { id: '6', name: 'Casey', top: '40%', left: '45%', color: 'bg-cyan-500' },
  { id: '7', name: 'Morgan', top: '55%', left: '80%', color: 'bg-rose-500' },
  { id: '8', name: 'Drew', top: '30%', left: '15%', color: 'bg-orange-500' },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: FRIENDS_LOCATIONS,
    metadata: { total: FRIENDS_LOCATIONS.length },
  });
}

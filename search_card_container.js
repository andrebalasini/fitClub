import fs from 'fs';

const content = fs.readFileSync('c:/Antigravity/fitClub/src/pages/ActiveWorkout.tsx', 'utf-8');
const lines = content.split('\n');

for (let i = 1635; i <= 1685; i++) {
  console.log(`${i}: ${lines[i - 1]}`);
}

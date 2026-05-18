import { execSync } from 'child_process';
import fs from 'fs';

try {
  const diff = execSync('git diff src/pages/ActiveWorkout.tsx', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  console.log(`Diff size: ${diff.length} characters`);
  
  // Write to a UTF-8 file that is easy to view
  fs.writeFileSync('src/clean_diff.txt', diff, 'utf8');
  console.log("Wrote clean_diff.txt successfully.");
} catch (err) {
  console.error("Error running git diff:", err);
}

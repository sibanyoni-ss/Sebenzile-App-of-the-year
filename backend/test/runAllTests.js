const { spawnSync } = require('child_process');
const path = require('path');

const testFiles = [
    'security.test.js',
    'legalHelp.test.js',
    'frontendChecks.test.js'
];

console.log('======================================================');
console.log('🚀 RUNNING ALL LAWCOMPASS VERIFICATION SUITES');
console.log('======================================================');

let allPassed = true;

for (const file of testFiles) {
    const fullPath = path.join(__dirname, file);
    console.log(`\n▶ Executing: ${file}`);
    const result = spawnSync('node', [fullPath], { stdio: 'inherit', shell: true });
    if (result.status !== 0) {
        allPassed = false;
        console.error(`❌ Suite ${file} exited with status ${result.status}`);
    }
}

if (!allPassed) {
    console.error('\n❌ ONE OR MORE TEST SUITES FAILED.\n');
    process.exit(1);
} else {
    console.log('\n🌟 ALL TEST SUITES COMPLETED SUCCESSFULLY!\n');
    process.exit(0);
}

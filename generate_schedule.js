const fs = require('fs');
const schedule = {};
for (let i = 1; i <= 30; i++) {
    schedule[i.toString()] = {
        'Car Park Manager': { Pagi: 0, Siang: 0, Malam: 0, Middle: i % 7 === 0 ? 0 : 1 },
        'IT': { Pagi: 0, Siang: 0, Malam: 0, Middle: i % 7 === 6 ? 0 : 1 },
        'Administrasi': { Pagi: 1, Siang: 0, Malam: 0, Middle: 1 },
        'Supervisor': { Pagi: i % 2 === 0 ? 1 : 0, Siang: i % 2 !== 0 ? 1 : 0, Malam: 1, Middle: 0 },
        'Leader': { Pagi: 2, Siang: 1, Malam: 0, Middle: 0 },
        'Staff': { Pagi: 6, Siang: 7, Malam: 4, Middle: 4 }
    };
}
if (!fs.existsSync('storage/app/schedules')) fs.mkdirSync('storage/app/schedules', { recursive: true });
fs.writeFileSync('storage/app/schedules/schedule_2026_06.json', JSON.stringify(schedule, null, 4));
console.log('Generated schedule_2026_06.json');

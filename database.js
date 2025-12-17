const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./snaptime.db", (err) => {
    if (err) console.error("DB error:", err.message);
    else console.log("Connected to SQLite database.");
});

// Create tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            sleep_hours INTEGER,
            meals TEXT,
            energy_level TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS timetable (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT,
            subject TEXT,
            start_time TEXT,
            end_time TEXT
        )
    `);
});

module.exports = db;

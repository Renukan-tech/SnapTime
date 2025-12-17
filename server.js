const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

// Add check-in
app.post("/checkin", (req, res) => {
    const { date, sleep_hours, meals, energy_level } = req.body;

    db.run(
        `INSERT INTO checkins (date, sleep_hours, meals, energy_level) VALUES (?, ?, ?, ?)`,
        [date, sleep_hours, meals, energy_level],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: "Check-in saved", id: this.lastID });
        }
    );
});

// Get weekly timetable
app.get("/timetable", (req, res) => {
    db.all(`SELECT * FROM timetable`, [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

// Add timetable entry
app.post("/timetable", (req, res) => {
    const { day, subject, start_time, end_time } = req.body;

    db.run(
        `INSERT INTO timetable (day, subject, start_time, end_time) VALUES (?, ?, ?, ?)`,
        [day, subject, start_time, end_time],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: "Timetable entry added", id: this.lastID });
        }
    );
});

app.listen(5000, () => console.log("Backend running on http://localhost:5000"));

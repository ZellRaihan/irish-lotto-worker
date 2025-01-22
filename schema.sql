-- Create lottery_results table
CREATE TABLE IF NOT EXISTS lottery_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_date DATETIME NOT NULL,
    jackpot_amount TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create winning_numbers table
CREATE TABLE IF NOT EXISTS winning_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL,
    game_type TEXT NOT NULL, -- 'main', 'plus1', 'plus2'
    numbers TEXT NOT NULL, -- Stored as JSON array
    bonus_number INTEGER,
    FOREIGN KEY (result_id) REFERENCES lottery_results(id)
);

-- Create prize_breakdown table
CREATE TABLE IF NOT EXISTS prize_breakdown (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL,
    game_type TEXT NOT NULL,
    match_type TEXT NOT NULL,
    winners INTEGER NOT NULL,
    prize_amount TEXT NOT NULL,
    FOREIGN KEY (result_id) REFERENCES lottery_results(id)
);

-- Create indexes
CREATE INDEX idx_lottery_results_draw_date ON lottery_results(draw_date);
CREATE INDEX idx_winning_numbers_result_id ON winning_numbers(result_id);
CREATE INDEX idx_prize_breakdown_result_id ON prize_breakdown(result_id);

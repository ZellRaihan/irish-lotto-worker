import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { html } from 'hono/html';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Serve static files
app.get('/', async (c) => {
    const response = await fetch('https://raw.githubusercontent.com/ZellRaihan/irish-lotto-worker/master/public/index.html');
    const content = await response.text();
    return c.html(content);
});

app.get('/css/*', async (c) => {
    const path = c.req.path.replace('/css/', '');
    const response = await fetch(`https://raw.githubusercontent.com/ZellRaihan/irish-lotto-worker/master/public/css/${path}`);
    const content = await response.arrayBuffer();
    return c.body(content, {
        headers: { 'Content-Type': 'text/css' }
    });
});

app.get('/js/*', async (c) => {
    const path = c.req.path.replace('/js/', '');
    const response = await fetch(`https://raw.githubusercontent.com/ZellRaihan/irish-lotto-worker/master/public/js/${path}`);
    const content = await response.arrayBuffer();
    return c.body(content, {
        headers: { 'Content-Type': 'application/javascript' }
    });
});

// API Routes
app.get('/api/results', async (c) => {
    const { page = 1, limit = 10 } = c.req.query();
    const offset = (page - 1) * limit;

    const { results } = await c.env.DB.prepare(`
        SELECT 
            lr.*,
            (
                SELECT json_group_array(
                    json_object(
                        'game_type', game_type,
                        'numbers', numbers,
                        'bonus_number', bonus_number
                    )
                )
                FROM winning_numbers
                WHERE result_id = lr.id
            ) as winning_numbers,
            (
                SELECT json_group_array(
                    json_object(
                        'game_type', game_type,
                        'match_type', match_type,
                        'winners', winners,
                        'prize_amount', prize_amount
                    )
                )
                FROM prize_breakdown
                WHERE result_id = lr.id
            ) as prize_breakdown
        FROM lottery_results lr
        ORDER BY draw_date DESC
        LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const { total } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM lottery_results').first();

    return c.json({
        results,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
        }
    });
});

// Get single result
app.get('/api/results/:id', async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(`
        SELECT 
            lr.*,
            (
                SELECT json_group_array(
                    json_object(
                        'game_type', game_type,
                        'numbers', numbers,
                        'bonus_number', bonus_number
                    )
                )
                FROM winning_numbers
                WHERE result_id = lr.id
            ) as winning_numbers,
            (
                SELECT json_group_array(
                    json_object(
                        'game_type', game_type,
                        'match_type', match_type,
                        'winners', winners,
                        'prize_amount', prize_amount
                    )
                )
                FROM prize_breakdown
                WHERE result_id = lr.id
            ) as prize_breakdown
        FROM lottery_results lr
        WHERE lr.id = ?
    `).bind(id).first();

    if (!result) {
        return c.json({ error: 'Result not found' }, 404);
    }

    return c.json(result);
});

// Manual fetch endpoint
app.post('/api/fetch-results', async (c) => {
    try {
        const response = await fetch('https://www.lottery.ie/_next/data/mvk05VlOxs17Hawg8CCE5/en/results/lotto/history.json');
        const data = await response.json();
        const results = data.pageProps.list;
        let newResults = 0;

        // Process each result
        for (const result of results) {
            const drawDate = new Date(result.standard.drawDates[0]);
            
            // Check if result already exists
            const existing = await c.env.DB.prepare('SELECT id FROM lottery_results WHERE draw_date = ?')
                .bind(drawDate.toISOString())
                .first();

            if (!existing) {
                newResults++;
                // Insert new result
                const { lastRowId } = await c.env.DB.prepare(`
                    INSERT INTO lottery_results (draw_date, jackpot_amount)
                    VALUES (?, ?)
                `).bind(
                    drawDate.toISOString(),
                    result.standard.jackpotAmount
                ).run();

                // Insert winning numbers
                await c.env.DB.prepare(`
                    INSERT INTO winning_numbers (result_id, game_type, numbers, bonus_number)
                    VALUES (?, ?, ?, ?)
                `).bind(
                    lastRowId,
                    'main',
                    JSON.stringify(result.standard.grids[0].standard[0]),
                    result.standard.grids[0].additional[0][0]
                ).run();

                // Insert prize breakdown
                for (const prize of result.standard.prizeTiers) {
                    await c.env.DB.prepare(`
                        INSERT INTO prize_breakdown (result_id, game_type, match_type, winners, prize_amount)
                        VALUES (?, ?, ?, ?, ?)
                    `).bind(
                        lastRowId,
                        'main',
                        prize.match,
                        prize.winners,
                        prize.prize
                    ).run();
                }
            }
        }

        return c.json({ 
            success: true, 
            message: `Successfully fetched results. ${newResults} new results added.` 
        });
    } catch (error) {
        console.error('Error updating results:', error);
        return c.json({ 
            success: false, 
            message: 'Error fetching results: ' + error.message 
        }, 500);
    }
});

// Scheduled task to fetch and update results
app.scheduled = async (event, env, ctx) => {
    try {
        const response = await fetch('https://www.lottery.ie/_next/data/mvk05VlOxs17Hawg8CCE5/en/results/lotto/history.json');
        const data = await response.json();
        const results = data.pageProps.list;

        // Process each result
        for (const result of results) {
            const drawDate = new Date(result.standard.drawDates[0]);
            
            // Check if result already exists
            const existing = await env.DB.prepare('SELECT id FROM lottery_results WHERE draw_date = ?')
                .bind(drawDate.toISOString())
                .first();

            if (!existing) {
                // Insert new result
                const { lastRowId } = await env.DB.prepare(`
                    INSERT INTO lottery_results (draw_date, jackpot_amount)
                    VALUES (?, ?)
                `).bind(
                    drawDate.toISOString(),
                    result.standard.jackpotAmount
                ).run();

                // Insert winning numbers
                await env.DB.prepare(`
                    INSERT INTO winning_numbers (result_id, game_type, numbers, bonus_number)
                    VALUES (?, ?, ?, ?)
                `).bind(
                    lastRowId,
                    'main',
                    JSON.stringify(result.standard.grids[0].standard[0]),
                    result.standard.grids[0].additional[0][0]
                ).run();

                // Insert prize breakdown
                for (const prize of result.standard.prizeTiers) {
                    await env.DB.prepare(`
                        INSERT INTO prize_breakdown (result_id, game_type, match_type, winners, prize_amount)
                        VALUES (?, ?, ?, ?, ?)
                    `).bind(
                        lastRowId,
                        'main',
                        prize.match,
                        prize.winners,
                        prize.prize
                    ).run();
                }
            }
        }
    } catch (error) {
        console.error('Error updating results:', error);
    }
};

export default app;

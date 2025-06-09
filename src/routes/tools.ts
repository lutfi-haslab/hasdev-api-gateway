import { Hono } from 'hono';
import * as cheerio from 'cheerio';
import { DateTime } from "luxon";
import { describeRoute } from 'hono-openapi';

const toolsRoute = new Hono();

// CORS middleware for all routes
toolsRoute.use('*', async (c, next) => {
    // Set CORS headers
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS method (preflight requests)
    if (c.req.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
    }

    await next();
});

// Link preview endpoint
toolsRoute.post('/preview', async (c) => {
    const { url } = await c.req.json();

    if (!url) {
        return c.json(
            { success: 0, error: 'No URL provided' },
            400
        );
    }

    try {
        // Validate URL format
        new URL(url);
    } catch (e) {
        return c.json(
            { success: 0, error: 'Invalid URL format' },
            400
        );
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0; +https://yourdomain.com)',
                'Accept': 'text/html,application/xhtml+xml',
            },
            redirect: 'follow'
        });

        if (!response.ok) {
            return c.json(
                { success: 0, error: `Failed to fetch URL (HTTP ${response.status})` },
                400
            );
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('text/html')) {
            return c.json(
                { success: 0, error: 'URL does not return HTML content' },
                400
            );
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const getMetaContent = (properties: string[]) => {
            for (const prop of properties) {
                const content = $(`meta[property="${prop}"]`).attr('content') ||
                    $(`meta[name="${prop}"]`).attr('content');
                if (content) return content;
            }
            return null;
        };

        const title = getMetaContent(['og:title', 'twitter:title']) || $('title').text() || url;
        const description = getMetaContent(['og:description', 'twitter:description', 'description']) || '';
        const image = getMetaContent(['og:image', 'twitter:image:src', 'twitter:image']) || '';

        return c.json({
            success: 1,
            meta: {
                title: title.trim(),
                description: description.trim(),
                image: {
                    url: image.trim(),
                },
                url,
            },
        });
    } catch (error) {
        console.error('Link preview error:', error);
        return c.json(
            { success: 0, error: 'Error processing request' },
            500
        );
    }
});

// Time endpoint
toolsRoute.get("/time", describeRoute({
    description: "Get current time",
    tags: ["Tools"],
    responses: {
        200: {
            description: "Successful response",
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            timezone: { type: 'string' },
                            datetime: { type: 'string' },
                            date: { type: 'string' },
                            time: { type: 'string' },
                            unix: { type: 'number' },
                            offset: { type: 'number' },
                            time_12hr: { type: 'string' },
                            time_24hr: { type: 'string' },
                            day_of_week: { type: 'number' },
                            day_of_year: { type: 'number' },
                        },
                    },
                },
            },
        },
    },
}), async (c) => {
    const { searchParams } = new URL(c.req.url);
    const timezone = searchParams.get("timezone") || 'UTC';

    try {
        const now = DateTime.now().setZone(timezone);

        if (!now.isValid) {
            return c.json(
                { error: `Invalid timezone: ${timezone}` },
                400
            );
        }

        return c.json({
            timezone: now.zoneName,
            datetime: now.toISO(),
            date: now.toISODate(),
            time: now.toISOTime({ suppressMilliseconds: true }),
            unix: Math.floor(now.toSeconds()), // Whole seconds
            offset: now.offset, // minutes from UTC
            time_12hr: now.toFormat('hh:mm a'),
            time_24hr: now.toFormat('HH:mm'),
            day_of_week: now.weekday,
            day_of_year: now.ordinal,
        });
    } catch (error) {
        console.error('Time error:', error);
        return c.json(
            { error: 'Internal server error' },
            500
        );
    }
});

export default toolsRoute;
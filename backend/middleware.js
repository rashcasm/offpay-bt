export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    if (err.type === 'validation') {
        return res.status(400).json({
            error: err.message,
            type: 'validation'
        });
    }

    if (err.type === 'database') {
        return res.status(500).json({
            error: 'Database operation failed',
            type: 'database'
        });
    }

    if (err.type === 'bluetooth') {
        return res.status(503).json({
            error: 'Bluetooth communication failed',
            type: 'bluetooth'
        });
    }

    // Default error
    res.status(500).json({
        error: 'Internal server error',
        type: 'internal'
    });
};

export const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
};

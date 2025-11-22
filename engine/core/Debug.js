/**
 * Ballerburg 3D - Debug & Logging System
 * Provides comprehensive logging, error tracking, and debug utilities
 * All output also written to debug-log.txt via download mechanism
 */

const Debug = (function() {
    'use strict';

    // Log levels
    const LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4
    };

    // Configuration
    let config = {
        level: LEVELS.DEBUG,
        enabled: true,
        logToConsole: true,
        logToFile: true,
        maxLogEntries: 1000,
        showTimestamp: true,
        showCaller: true
    };

    // Log storage
    let logEntries = [];
    let errorCount = 0;
    let warnCount = 0;
    let startTime = Date.now();

    /**
     * Get formatted timestamp
     */
    function getTimestamp() {
        const now = new Date();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(3);
        return `[${now.toISOString()}][+${elapsed}s]`;
    }

    /**
     * Get caller info from stack trace
     */
    function getCaller() {
        try {
            const stack = new Error().stack;
            const lines = stack.split('\n');
            // Skip Error, getCaller, log function, and Debug.X call
            const callerLine = lines[4] || lines[3] || '';
            const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
                         callerLine.match(/at\s+(.+?):(\d+):(\d+)/);
            if (match) {
                return `[${match[1] || 'anonymous'}:${match[3] || match[2]}]`;
            }
        } catch (e) {}
        return '';
    }

    /**
     * Format log entry
     */
    function formatEntry(level, message, data) {
        let entry = '';

        if (config.showTimestamp) {
            entry += getTimestamp();
        }

        entry += `[${level}]`;

        if (config.showCaller) {
            entry += getCaller();
        }

        entry += ' ' + message;

        if (data !== undefined) {
            try {
                if (typeof data === 'object') {
                    entry += ' ' + JSON.stringify(data, null, 2);
                } else {
                    entry += ' ' + String(data);
                }
            } catch (e) {
                entry += ' [Object - circular reference]';
            }
        }

        return entry;
    }

    /**
     * Core log function
     */
    function log(levelName, levelNum, message, data) {
        if (!config.enabled || levelNum > config.level) return;

        const entry = formatEntry(levelName, message, data);

        // Store entry
        logEntries.push({
            level: levelName,
            message: message,
            data: data,
            timestamp: Date.now(),
            formatted: entry
        });

        // Trim if needed
        if (logEntries.length > config.maxLogEntries) {
            logEntries.shift();
        }

        // Console output
        if (config.logToConsole) {
            switch (levelNum) {
                case LEVELS.ERROR:
                    console.error(entry);
                    break;
                case LEVELS.WARN:
                    console.warn(entry);
                    break;
                case LEVELS.INFO:
                    console.info(entry);
                    break;
                default:
                    console.log(entry);
            }
        }

        // Track error/warn counts
        if (levelNum === LEVELS.ERROR) errorCount++;
        if (levelNum === LEVELS.WARN) warnCount++;
    }

    /**
     * Assert condition
     */
    function assert(condition, message, data) {
        if (!condition) {
            log('ASSERT', LEVELS.ERROR, 'Assertion failed: ' + message, data);
            throw new Error('Assertion failed: ' + message);
        }
    }

    /**
     * Download log file
     */
    function downloadLog() {
        const content = getFullLog();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'debug-log.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Get full log as string
     */
    function getFullLog() {
        const header = [
            '='.repeat(60),
            'BALLERBURG 3D - DEBUG LOG',
            '='.repeat(60),
            `Generated: ${new Date().toISOString()}`,
            `Session Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
            `Total Entries: ${logEntries.length}`,
            `Errors: ${errorCount}`,
            `Warnings: ${warnCount}`,
            '='.repeat(60),
            ''
        ].join('\n');

        const entries = logEntries.map(e => e.formatted).join('\n');

        return header + entries;
    }

    /**
     * Get log entries filtered by level
     */
    function getEntries(minLevel = LEVELS.TRACE) {
        return logEntries.filter(e => LEVELS[e.level] <= minLevel);
    }

    /**
     * Clear log
     */
    function clear() {
        logEntries = [];
        errorCount = 0;
        warnCount = 0;
        log('INFO', LEVELS.INFO, 'Log cleared');
    }

    /**
     * Get statistics
     */
    function getStats() {
        return {
            totalEntries: logEntries.length,
            errorCount: errorCount,
            warnCount: warnCount,
            sessionDuration: Date.now() - startTime,
            memoryUsage: typeof performance !== 'undefined' && performance.memory ?
                performance.memory.usedJSHeapSize : 'N/A'
        };
    }

    /**
     * Wrap function with error handling
     */
    function wrap(fn, context, name) {
        return function(...args) {
            try {
                return fn.apply(context, args);
            } catch (e) {
                log('ERROR', LEVELS.ERROR, `Exception in ${name || fn.name || 'anonymous'}`, {
                    error: e.message,
                    stack: e.stack
                });
                throw e;
            }
        };
    }

    /**
     * Time a function
     */
    function time(label) {
        const start = performance.now();
        return {
            end: function() {
                const duration = performance.now() - start;
                log('DEBUG', LEVELS.DEBUG, `Timer [${label}]: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }

    // Public API
    return {
        // Log levels
        LEVELS: LEVELS,

        // Logging functions
        error: (msg, data) => log('ERROR', LEVELS.ERROR, msg, data),
        warn: (msg, data) => log('WARN', LEVELS.WARN, msg, data),
        info: (msg, data) => log('INFO', LEVELS.INFO, msg, data),
        debug: (msg, data) => log('DEBUG', LEVELS.DEBUG, msg, data),
        trace: (msg, data) => log('TRACE', LEVELS.TRACE, msg, data),

        // Utilities
        assert: assert,
        wrap: wrap,
        time: time,

        // Log management
        getFullLog: getFullLog,
        getEntries: getEntries,
        getStats: getStats,
        clear: clear,
        downloadLog: downloadLog,

        // Configuration
        setLevel: (level) => { config.level = level; },
        setEnabled: (enabled) => { config.enabled = enabled; },
        getConfig: () => ({ ...config }),

        // Initialization message
        init: function() {
            log('INFO', LEVELS.INFO, 'Debug system initialized', {
                level: Object.keys(LEVELS).find(k => LEVELS[k] === config.level),
                timestamp: new Date().toISOString()
            });
        }
    };
})();

// Auto-initialize
if (typeof window !== 'undefined') {
    window.Debug = Debug;
    Debug.init();
}

(function () {
    var STORAGE_KEY = 'transactions.filterPeriod';

    function parseStoredValue() {
        try {
            if (!('localStorage' in window)) {
                return null;
            }
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return null;
            }
            var parsed = JSON.parse(raw);
            if (parsed && (typeof parsed.startDate === 'string' || typeof parsed.endDate === 'string')) {
                return {
                    startDate: parsed.startDate || '',
                    endDate: parsed.endDate || ''
                };
            }
        } catch (e) {
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            } catch (ignore) {
                // ignored
            }
        }
        return null;
    }

    function saveValue(startDate, endDate) {
        if (!('localStorage' in window)) {
            return;
        }
        var payload = {
            startDate: startDate || '',
            endDate: endDate || ''
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    function removeStoredValue() {
        if (!('localStorage' in window)) {
            return;
        }
        window.localStorage.removeItem(STORAGE_KEY);
    }

    function normalizeValue(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.trim();
    }

    function persistCurrentValues(startInput, endInput) {
        var startValue = normalizeValue(startInput.value);
        var endValue = normalizeValue(endInput.value);

        if (startValue || endValue) {
            saveValue(startValue, endValue);
        } else {
            removeStoredValue();
        }
    }

    function init() {
        if (!('localStorage' in window)) {
            return;
        }

        var form = document.querySelector('form[data-transactions-filter]');
        if (!form) {
            return;
        }

        var startInput = form.querySelector('input[name="startDate"]');
        var endInput = form.querySelector('input[name="endDate"]');

        if (!startInput || !endInput) {
            return;
        }

        var params = new URLSearchParams(window.location.search);
        var startParam = normalizeValue(params.get('startDate'));
        var endParam = normalizeValue(params.get('endDate'));

        if (startParam || endParam) {
            saveValue(startParam, endParam);
        } else {
            var currentStart = normalizeValue(startInput.value);
            var currentEnd = normalizeValue(endInput.value);

            if (currentStart || currentEnd) {
                saveValue(currentStart, currentEnd);
            } else {
                var stored = parseStoredValue();
                if (stored) {
                    if (stored.startDate) {
                        startInput.value = stored.startDate;
                    }
                    if (stored.endDate) {
                        endInput.value = stored.endDate;
                    }
                }
            }
        }

        persistCurrentValues(startInput, endInput);

        var handler = function () {
            persistCurrentValues(startInput, endInput);
        };

        form.addEventListener('submit', handler);
        startInput.addEventListener('change', handler);
        endInput.addEventListener('change', handler);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

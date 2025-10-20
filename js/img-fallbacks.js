// Força fallback em imagens que retornam 404
(function () {
    function setFallback(img) {
        const fallback = '/images/default-image.svg';
        if (img.src !== fallback) img.src = fallback;
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', function () { setFallback(img); });
        });
    });
})();

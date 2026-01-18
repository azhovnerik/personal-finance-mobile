(function () {
    function toggleWithBootstrap(collapseEl) {
        if (window.bootstrap && bootstrap.Collapse) {
            var instance = bootstrap.Collapse.getOrCreateInstance(collapseEl, {toggle: false});
            instance.toggle();
            return true;
        }
        return false;
    }

    function hideWithBootstrap(collapseEl) {
        if (window.bootstrap && bootstrap.Collapse) {
            var instance = bootstrap.Collapse.getOrCreateInstance(collapseEl, {toggle: false});
            instance.hide();
            return true;
        }
        return false;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var toggler = document.querySelector('.app-navbar .navbar-toggler');
        var collapseEl = document.getElementById('navbarNavAltMarkup');

        if (!toggler || !collapseEl) {
            return;
        }

        toggler.addEventListener('click', function () {
            if (!toggleWithBootstrap(collapseEl)) {
                collapseEl.classList.toggle('show');
            }
        });

        collapseEl.querySelectorAll('.nav-link').forEach(function (link) {
            link.addEventListener('click', function () {
                if (window.innerWidth < 768) {
                    if (!hideWithBootstrap(collapseEl)) {
                        collapseEl.classList.remove('show');
                    }
                }
            });
        });
    });
})();

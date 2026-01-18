(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var forms = Array.prototype.slice.call(document.querySelectorAll('form[data-confirm-delete]'));
        if (!forms.length) {
            return;
        }
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
            console.warn('Bootstrap Modal is required for confirm-delete behaviour.');
            return;
        }
        if (document.getElementById('confirmDeleteModal')) {
            return;
        }
        var body = document.body;
        var defaults = {
            title: body && body.dataset && body.dataset.confirmDeleteTitle ? body.dataset.confirmDeleteTitle : 'Confirm deletion',
            message: body && body.dataset && body.dataset.confirmDeleteMessage ? body.dataset.confirmDeleteMessage : 'Are you sure you want to delete this item?',
            confirm: body && body.dataset && body.dataset.confirmDeleteConfirm ? body.dataset.confirmDeleteConfirm : 'Delete',
            cancel: body && body.dataset && body.dataset.confirmDeleteCancel ? body.dataset.confirmDeleteCancel : 'Cancel'
        };
        var modalTemplate = '<div class="modal fade" id="confirmDeleteModal" tabindex="-1" aria-hidden="true">' +
            '<div class="modal-dialog modal-dialog-centered">' +
            '<div class="modal-content">' +
            '<div class="modal-header">' +
            '<h5 class="modal-title" data-confirm-delete-title></h5>' +
            '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
            '</div>' +
            '<div class="modal-body" data-confirm-delete-message></div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn md-btn md-btn-outline md-btn-outline-secondary" data-bs-dismiss="modal" data-confirm-delete-cancel></button>' +
            '<button type="button" class="btn md-btn md-btn-danger" data-confirm-delete-confirm></button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        body.insertAdjacentHTML('beforeend', modalTemplate);
        var modalElement = document.getElementById('confirmDeleteModal');
        var modal = new bootstrap.Modal(modalElement);
        var titleElement = modalElement.querySelector('[data-confirm-delete-title]');
        var messageElement = modalElement.querySelector('[data-confirm-delete-message]');
        var confirmButton = modalElement.querySelector('[data-confirm-delete-confirm]');
        var cancelButton = modalElement.querySelector('[data-confirm-delete-cancel]');
        var activeForm = null;
        var resetModalText = function () {
            titleElement.textContent = defaults.title;
            messageElement.textContent = defaults.message;
            confirmButton.textContent = defaults.confirm;
            cancelButton.textContent = defaults.cancel;
        };
        resetModalText();
        cancelButton.addEventListener('click', function () {
            activeForm = null;
        });
        confirmButton.addEventListener('click', function () {
            if (!activeForm) {
                modal.hide();
                return;
            }
            var formToSubmit = activeForm;
            activeForm = null;
            formToSubmit.dataset.confirmed = 'true';
            modal.hide();
            formToSubmit.submit();
        });
        modalElement.addEventListener('hidden.bs.modal', function () {
            activeForm = null;
            resetModalText();
        });
        var updateModalText = function (form) {
            titleElement.textContent = form.dataset.confirmTitle || defaults.title;
            messageElement.textContent = form.dataset.confirmMessage || defaults.message;
            confirmButton.textContent = form.dataset.confirmConfirm || form.dataset.confirmButton || defaults.confirm;
            cancelButton.textContent = form.dataset.confirmCancel || defaults.cancel;
        };
        forms.forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (form.dataset.confirmed === 'true') {
                    form.dataset.confirmed = '';
                    return;
                }
                event.preventDefault();
                activeForm = form;
                updateModalText(form);
                modal.show();
            });
        });
    });
})();

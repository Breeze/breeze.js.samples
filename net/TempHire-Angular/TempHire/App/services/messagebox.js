(function(angular) {
    'use strict';

    angular.module('services')
        .factory('messagebox', ['$modal', factory])
        .controller('MessageBoxController', ['$modalInstance', 'args', controller]);

    function factory($modal) {
        var tpl = [
            '<div class="messageBox">',
                '<div class="modal-header">',
                    '<h3>{{messagebox.title}}</h3>',
                '</div>',
                '<div class="modal-body">',
                    '<p>{{messagebox.message}}</p>',
                '</div>',
                '<div class="modal-footer">',
                    '<button class="btn" ng-repeat="option in messagebox.options" ng-click="messagebox.action(option)" >{{option}}</button>',
                '</div>',
             '</div>'
        ].join('\n');

        return {
            show: show
        };

        function show(title, message, options) {
            var modalInstance = $modal.open({
                template: tpl,
                controller: 'MessageBoxController',
                controllerAs: 'messagebox',
                resolve: {
                    args: function() {
                        return {
                            title: title,
                            message: message,
                            options: options
                        };
                    }
                }
            });

            return modalInstance.result;
        }
    }

    function controller($modalInstance, args) {
        this.$modalInstance = $modalInstance;
        this.title = args.title;
        this.message = args.message;
        this.options = args.options;
    }

    controller.prototype.action = function(selectedOption) {
        this.$modalInstance.close(selectedOption);
    }

})(window.angular);
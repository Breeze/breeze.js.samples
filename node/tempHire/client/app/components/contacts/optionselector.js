(function(angular) {
    'use strict';

    angular.module('viewmodel.contacts').controller('OptionSelectorController', ['$modalInstance', 'args', controller]);

    function controller($modalInstance, args) {
        this.$modalInstance = $modalInstance;
        this.label = args.label;
        this.options = args.options;
        this.optionsText = args.optionsText;
        this.optionsValue = args.optionsValue;
        this.optionExpressions = 'option[optionselector.optionsValue] as option[optionselector.optionsText] for option in optionselector.options';
        this.selectedValue = this.options.length > 0 ? this.options[0].id : null;
    }

    controller.prototype.confirm = function () {
        var result = {
            selectedValue: this.selectedValue
        };
        this.$modalInstance.close(result);
    }

    controller.prototype.cancel = function () {
        this.$modalInstance.dismiss('cancel');
    }

})(window.angular);
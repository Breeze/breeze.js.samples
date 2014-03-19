(function(angular) {
    'use strict';

    angular.module("app")
           .controller( 'cartController', cartController );

        // **************************************
        // Private construction function
        // **************************************

        function cartController( dataservice, pricing)
        {
            var vm = this;

                vm.calc       = calc;
                vm.cartOrder  = dataservice.cartOrder;
                vm.removeItem = removeItem;

            // Calculate right away...
            calc();

            // *********************************************************
            // Private methods
            // *********************************************************

            function calc()
            {
                var haveItems = $scope.haveItems = cartOrder.orderItems.length;
                if (haveItems) {
                    pricing.calcOrderItemsTotal(cartOrder);
                    vm.someCostMore = pricing.orderHasExtraCostOptions(cartOrder);
                }
            }

            function removeItem(orderItem)
            {
                //don't need to remove if item is an entity (e.g, SQL version)
                dataservice.cartOrder.removeItem(orderItem);
                dataservice.draftOrder.addItem(orderItem);
                calc();
            }
        }

})();

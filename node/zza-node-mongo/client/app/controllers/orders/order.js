(function(angular) {
    'use strict';

    angular.module( "app" )
        .controller( 'order', controller );

    // **************************************
    // Annotated construction function
    // **************************************

    function controller( $location, dataservice )
    {
        var vm = this;

        // Routes within the orderSideBar view that lead to order content view changes

        var links = [
             { path: '/menu/pizza' ,name: 'Pizza'  }
            ,{ path: '/menu/salad' ,name: 'Salad'  }
            ,{ path: '/menu/drink' ,name: 'Drinks' }
        ];

        dataservice.ready( function()
        {
            vm.links      = links;
            vm.cartOrder  = dataservice.cartOrder;
            vm.draftOrder = dataservice.draftOrder;

            vm.isSelected = isSelected;

        });

        function isSelected( link )
        {
            return -1 < $location.path().toLowerCase().indexOf(link.path);
        }

        function orderItemLink(item){
           return '#/order/'+product.type+'/'+item.id;
        }
    };

}( this.angular ));

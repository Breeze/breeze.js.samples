(function(angular) {
    'use strict';

    angular.module( "app" )
        .controller( 'orderSidebar', controller );

    function controller( $location, dataservice ) {
        var vm = this;
        var menuLinks = [
             { path: '/menu/pizza' ,name: 'Pizza' , tag: 'pizza'  }
            ,{ path: '/menu/salad' ,name: 'Salad' , tag: 'salad' }
            ,{ path: '/menu/drink' ,name: 'Drinks', tag: 'drink' }
        ];

        dataservice.ready( function()
        {
            vm.cartItemLink  = cartItemLink;
            vm.cartOrder     = dataservice.cartOrder;
            vm.draftItemLink = draftItemLink;
            vm.draftOrder    = dataservice.draftOrder;
            vm.isSelected    = isSelected;
            vm.menuLinks     = menuLinks;
        });

        function cartItemLink(item){
            return '#/order/cart/'+item.product.type+'/'+item.id;
        }

        function draftItemLink(item){
            return '#/order/draft/'+item.product.type+'/'+item.id;
        }

        function isSelected( link )
        {
            return -1 < $location.path().toLowerCase().indexOf(link.tag);
        }

    };

}( this.angular ));

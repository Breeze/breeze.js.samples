(function(angular) {
    'use strict';

    angular.module( "app" )
        .controller( 'orderSidebar', controller );

    function controller( $location, dataservice ) {
        var vm = this;

        dataservice.ready( function() {
            vm.cartItemStateRef  = cartItemStateRef;
            vm.cartOrder         = dataservice.cartOrder;
            vm.draftItemStateRef = draftItemStateRef;
            vm.draftOrder        = dataservice.draftOrder;
            vm.isSelected        = isSelected;
            vm.menuStates        = getMenuStates();
        });

        function cartItemStateRef(item){
            return getItemStateRef('cart', item)
        }

        function draftItemStateRef(item){
            return getItemStateRef('draft', item)
        }

        function getItemStateRef(orderId, item){
            var params = {orderId: orderId, productType: item.product.type, orderItemId: item.id };
            return 'app.order.item('+JSON.stringify(params)+')';
            //return '#/order/cart/'+item.product.type+'/'+item.id;
        }

        function getMenuStates(){
            var menus = [
                { name: 'Pizza',  tag: 'pizza'},
                { name: 'Salad',  tag: 'salad'},
                { name: 'Drinks', tag: 'drink'}
            ];
            return menus.map(function(s){
                return {
                    name: s.name,
                    sref: "app.menu({productType: '"+ s.tag + "'})",
                    tag: s.tag
                }
            });
        }

        function isSelected( state ){
            var path = $location.path().toLowerCase();
            if (path === '/menu/') {path = path+'pizza';}
            return -1 < path.indexOf(state.tag);
        }

    };

}( this.angular ));

(function(angular) {
    'use strict';

    angular.module( "app" )
        .controller( 'header', controllerFn);

    function controllerFn(  ) {

        var headerStates = [
             { name: 'Home',  sref: 'app.welcome',    display: true }
            ,{ name: 'Order', sref: 'app.menu',       display: true}
            ,{ name: 'About', sref: 'app.about',      display: true}
            ,{ name: 'Cart',  sref: 'app.order.cart', display: false}
        ];

        var vm = this;
            vm.home        = getState('Home');
            vm.cart        = getState('Cart');
            vm.states      = getDisplayStates();
            vm.selectState = selectState;

        /* implementation */

        function getDisplayStates(){
            return headerStates.filter(function(s){return s.display});
        }

        function getState(name){
           return headerStates.filter(function(s){return s.name === name;})[0];
        }

         //Clear all state selections and highlight the user-selected state
        function selectState( selectedState ) {
            vm.states.forEach( function(s){ s.selected = ( s === selectedState );})
        }
    };

}( this.angular ));

/*
 * header viewmodel associated with the header.html view
 * at the top of the shell.
 * It displays navigation among the main app 'pages'
 */
(function(angular) {
    'use strict';

    angular.module( "app" ).controller( 'header', controller);

    function controller(  ) {

        var headerStates = [
             { name: 'Home',  sref: 'app.welcome' }
            ,{ name: 'Order', sref: 'app.menu({productType: \'pizza\'})' }
            ,{ name: 'Customer', sref: 'app.customer' }
            ,{ name: 'About', sref: 'app.about'}
        ];

        var vm = this;
            vm.homeSref    = 'app.welcome';
            vm.cartSref    = 'app.order.cart';
            vm.states      = headerStates;
            vm.selectState = selectState;

         //Clear all state selections and highlight the user-selected state
        function selectState( selectedState ) {
            vm.states.forEach( function(s){ s.selected = ( s === selectedState );})
        }
    };

}( this.angular ));

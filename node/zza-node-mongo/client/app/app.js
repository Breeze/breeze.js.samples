/*
 * Defines the AngularJS application module and initializes it
 */
(function( angular  ) {

    var app = angular.module( "app", [
        'breeze.angular',
        'ui.router',
        'ui.bootstrap' ] );

    // Injecting dataservice for a side-effect: the initial loading of data from server
    // The app may appear to be more responsive if this happens in background
    // while the app launches on a splash page that doesn't actually need data.
    app.run( ['util', 'dataservice', function run ( util ) {
        util.logger.info( "Zza SPA is loaded and running on " + util.config.server );
    }]);

})( this.angular );

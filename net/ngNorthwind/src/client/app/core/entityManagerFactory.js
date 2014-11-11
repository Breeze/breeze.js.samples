(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('entityManagerFactory', EntityManagerFactory);

    EntityManagerFactory.$inject = ['breeze', 'config', 'logger','wip-service'];

    function EntityManagerFactory(breeze, config, logger, wip) {
      
        // use camelCase property names on the client
        breeze.NamingConvention.camelCase.setAsDefault();

        // create a new manager talking to Northwind service 
        var host = config.apiHost;
        var serviceName = host+'Northwind';

        var manager = new breeze.EntityManager(serviceName); 
         
        wip.initialize(manager);

        logger.info('Connecting to '+ serviceName);

        return {
            isSampleService: /sampleservice/i.test(host),
            manager: manager
        };      
    }

})();
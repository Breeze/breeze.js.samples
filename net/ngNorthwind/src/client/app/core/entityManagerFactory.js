(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('entityManagerFactory', emFactory);

    emFactory.$inject = ['breeze', 'config', 'logger'];

    function emFactory(breeze, config, logger) {
      
        // use camelCase property names on the client
        breeze.NamingConvention.camelCase.setAsDefault();

        // create a new manager talking to Northwind service 
        var host = config.apiHost;
        var serviceName = host+'Northwind';

        var manager = new breeze.EntityManager(serviceName);  
        logger.info('Connecting to '+ serviceName);

        return {
            isSampleService: /sampleservice/i.test(host),
            manager: manager
        }      
    }

})();
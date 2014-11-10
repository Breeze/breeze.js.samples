(function () {
    'use strict';

    angular
        .module('app.core')
        .factory('model', model);

    model.$inject = ['breeze'];

    function model(breeze){
		
		return {
			extendMetadata: extendMetadata
		};

		///////////////////

 		function extendMetadata(metadataStore) {
            applyRequireReferenceValidators(metadataStore);
        }

        function applyRequireReferenceValidators(metadataStore) {
        	var entityType = metadataStore.getEntityType('Product');
            createRequireReferenceValidator(entityType, 'category');
            createRequireReferenceValidator(entityType, 'supplier');
        }

		function createRequireReferenceValidator(entityType, propertyName)  {
			var propertyDef = entityType.getProperty(propertyName);
			var keyName = propertyDef.foreignKeyNames[0];
            var name = 'requireReferenceEntity';
            var valFn = function(value){ return value ? value[keyName] !== 0 : false; };
            // isRequired = true so zValidate directive displays required indicator
            var ctx = { messageTemplate: 'Missing %displayName%', isRequired: true };

            var val = new breeze.Validator(name, valFn, ctx);
            propertyDef.validators.push(val);
        }
	} 
})();
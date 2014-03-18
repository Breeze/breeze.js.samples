(function( define ) {
    "use strict";

    // Prefix product images with the image basepath
    //  Usage:
    //  <img class="img-polaroid" data-product-src="{{product.image}}" title="{{product.name}}"/>

    define( [ 'app/config' ], function( ) {

        function productSrc ( config )
        {
            var productImageBasePath = config.productImageBasePath;
            var productUnknownImage  = config.productUnknownImage;

                function linkFn (scope, element, attrs) {
                    attrs.$observe('productSrc', function (value) {
                        value = value ? productImageBasePath + value : productUnknownImage;
                        attrs.$set('src', value);
                    });
                }

            return {
                priority: 99, // it needs to run after the attributes are interpolated
                link    : linkFn
            };
        };

        return [ 'config', productSrc ];
    });

}( this.define ));

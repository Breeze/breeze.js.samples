(function(angular) {
    'use strict';

    angular.module( "app" ).directive( 'productImgSrc', productImgSrc );

    // Prefix product images with the image basepath
    //  Usage:
    //  <img class="img-polaroid" data-product-img-src="{{product.image}}" title="{{product.name}}"/>
    function productImgSrc ( config ) {
        var productImageBasePath = config.productImageBasePath;
        var productUnknownImage  = config.productUnknownImage;

            function linkFn (scope, element, attrs) {
                attrs.$observe('productImgSrc', function (value) {
                    value = value ? productImageBasePath + value : productUnknownImage;
                    attrs.$set('src', value);
                });
            }

        return {
            priority: 99, // it needs to run after the attributes are interpolated
            link    : linkFn
        };
    };

}( this.angular ));

/* jshint -W101 */
(function () {
    'use strict';

    // categories
    var beverages  = { categoryName: 'Beverages'};
    var condiments = { categoryName: 'Condiments'}; 
    var dairy      = { categoryName: 'Dairy Products'};                     
    var meat       = { categoryName: 'Meat/Poultry'} ; 
    var seafood    = { categoryName: 'Seafood'}; 

    // suppliers
    var bigfoot  = {companyName: 'Bigfoot Breweries'};             
    var exotic   = {companyName: 'Exotic Liquids'};             
    var formaggi = {companyName: 'Formaggi Fortini s.r.l.'};
    var pavlova  = {companyName: 'Pavlova, Ltd.'};
    var svensk   = {companyName: 'Svensk Sjöföda AB'};

    var testData = {
        categories: [beverages, condiments, dairy, meat, seafood],
        customers: [
            { companyName: 'IdeaBlade',        contactName: 'Ward Bell',                 city: 'San Francisco', country: 'USA' },
            { companyName: 'QUICK-Stop',       contactName: 'Horst Kloss',               city: 'Berlin',        country: 'Germany' },
            { companyName: 'Suprêmes délices', contactName: 'Pascale Cartrain',          city: 'Charleroi',     country: 'Belgium' },
            { companyName: 'Bon app\'',        contactName: 'Laurence Lebihan',          city: 'Paris',         country: 'France' },
            { companyName: 'The Cracker Box',  contactName: 'Liu Wong',                  city: 'New York',      country: 'USA' },
            { companyName: 'Centro comercial Moctezuma', contactName: 'Francisco Chang', city: 'México D.F.',   country: 'Mexico' },
            { companyName: 'Simons bistro',    contactName: 'Jytte Petersen',            city: 'Kobenhavn',     country: 'Denmark' }            
        ],
        products: [
            { productID: 1, productName: 'Alice Mutton',      category: meat,       supplier: pavlova,  unitPrice: 39},
            { productID: 2, productName: 'Aniseed Syrup',     category: condiments, supplier: exotic,   unitPrice: 10},
            { productID: 3, productName: 'Röd Kaviar',        category: seafood,    supplier: svensk,   unitPrice: 15},
            { productID: 4, productName: 'Chai',              category: beverages,  supplier: exotic,   unitPrice: 18 },
            { productID: 5, productName: 'Gorgonzola Telino', category: dairy,      supplier: formaggi, unitPrice: 12.5 },
            { productID: 6, productName: 'Gravad lax',        category: seafood,    supplier: svensk,   unitPrice: 26 },
            { productID: 7, productName: 'Steeleye Stout',    category: beverages,  supplier: bigfoot,  unitPrice: 18 }           
        ],
        suppliers: [bigfoot, exotic, formaggi, pavlova, svensk]
    };

    angular
        .module('app.core')
        .value('test-data', testData);
})();
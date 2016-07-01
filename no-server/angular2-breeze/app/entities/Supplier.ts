import { EntityBase } from './EntityBase';
import { Product } from './Product';

/// <code-import> Place custom imports between <code-import> tags

/// </code-import>

export class Supplier extends EntityBase {

   /// <code> Place custom code between <code> tags
   
   /// </code>

   // Generated code. Do not place code below this line.
   supplierID: number;
   companyName: string;
   contactName: string;
   contactTitle: string;
   address: string;
   city: string;
   region: string;
   postalCode: string;
   country: string;
   phone: string;
   fax: string;
   homePage: string;
   rowVersion: number;
   products: Product[];
}


import { EntityBase } from './EntityBase';
import { Order } from './Order';

/// <code-import> Place custom imports between <code-import> tags

/// </code-import>

export class Customer extends EntityBase {

   /// <code> Place custom code between <code> tags
   
   /// </code>

   // Generated code. Do not place code below this line.
   customerID: string;
   customerID_OLD: string;
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
   rowVersion: number;
   orders: Order[];
}


import { EntityBase } from './EntityBase';
import { Order } from './Order';

/// <code-import> Place custom imports between <code-import> tags

/// </code-import>

export class InternationalOrder extends EntityBase {

   /// <code> Place custom code between <code> tags
   
   /// </code>

   // Generated code. Do not place code below this line.
   orderID: number;
   customsDescription: string;
   exciseTax: number;
   rowVersion: number;
   order: Order;
}


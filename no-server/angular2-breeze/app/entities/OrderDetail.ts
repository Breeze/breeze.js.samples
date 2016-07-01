import { EntityBase } from './EntityBase';
import { Product } from './Product';
import { Order } from './Order';

/// <code-import> Place custom imports between <code-import> tags

/// </code-import>

export class OrderDetail extends EntityBase {

   /// <code> Place custom code between <code> tags
   
   /// </code>

   // Generated code. Do not place code below this line.
   orderID: number;
   productID: number;
   unitPrice: number;
   quantity: number;
   discount: number;
   rowVersion: number;
   order: Order;
   product: Product;
}


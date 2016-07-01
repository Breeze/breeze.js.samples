import { EntityBase } from './EntityBase';
import { Product } from './Product';

/// <code-import> Place custom imports between <code-import> tags

/// </code-import>

export class Category extends EntityBase {

   /// <code> Place custom code between <code> tags
   
   /// </code>

   // Generated code. Do not place code below this line.
   categoryID: number;
   categoryName: string;
   description: string;
   picture: any;
   rowVersion: number;
   products: Product[];
}


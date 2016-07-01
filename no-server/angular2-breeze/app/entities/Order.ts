import { EntityBase } from './EntityBase';
import { Customer } from './Customer';
import { Employee } from './Employee';
import { OrderDetail } from './OrderDetail';
import { InternationalOrder } from './InternationalOrder';

/// <code-import> Place custom imports between <code-import> tags

/// </code-import>

export class Order extends EntityBase {

   /// <code> Place custom code between <code> tags
   
   /// </code>

   // Generated code. Do not place code below this line.
   orderID: number;
   customerID: string;
   employeeID: number;
   orderDate: Date;
   requiredDate: Date;
   shippedDate: Date;
   freight: number;
   shipName: string;
   shipAddress: string;
   shipCity: string;
   shipRegion: string;
   shipPostalCode: string;
   shipCountry: string;
   rowVersion: number;
   customer: Customer;
   employee: Employee;
   orderDetails: OrderDetail[];
   internationalOrder: InternationalOrder;
}


import { EntityBase } from './EntityBase';
import { UserRole } from './UserRole';

/// <code-import> Place custom imports between <code-import> tags

/// </code-import>

export class Role extends EntityBase {

   /// <code> Place custom code between <code> tags
   
   /// </code>

   // Generated code. Do not place code below this line.
   id: number;
   name: string;
   description: string;
   userRoles: UserRole[];
}


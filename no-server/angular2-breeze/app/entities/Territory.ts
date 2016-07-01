import { EntityBase } from './EntityBase';
import { EmployeeTerritory } from './EmployeeTerritory';
import { Region } from './Region';

/// <code-import> Place custom imports between <code-import> tags

/// </code-import>

export class Territory extends EntityBase {

   /// <code> Place custom code between <code> tags
   
   /// </code>

   // Generated code. Do not place code below this line.
   territoryID: number;
   territoryDescription: string;
   regionID: number;
   rowVersion: number;
   employeeTerritories: EmployeeTerritory[];
   region: Region;
}


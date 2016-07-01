import { Component } from '@angular/core';
import { HTTP_PROVIDERS } from '@angular/http';
import { EntityManagerService } from './entity-manager.service';
import { MetadataStoreService } from './metadata-store.service';
import { NorthwindService } from './northwind.service';

import { Customer } from './entities';
import { BreezeBridgeAngular2 } from 'breeze-bridge-angular2';
import { EntityManager } from 'breeze-client';

@Component({
  selector: 'my-app',
  template: `
    <h1>My new customer name is {{customer.companyName}}</h1>
    <p><i>
      Customers in the db: {{customers?.length}}; in cache: {{numInCache}}
    </i></p>
    <div *ngFor="let cust of customers">{{cust.companyName}}</div>
  `,
  providers: [
    BreezeBridgeAngular2,
    EntityManagerService,
    HTTP_PROVIDERS,
    MetadataStoreService,
    NorthwindService,
  ]
})
export class AppComponent {
  private _em: EntityManager;
  private customer: Customer;
  customers: Customer[];
  numInCache: number;

  constructor(
    private _emService: EntityManagerService,
    nwService: NorthwindService,
    bridge: BreezeBridgeAngular2) {

    this._em = _emService.entityManager;
    this.customer = <Customer>this._em.createEntity('Customer', { customerID: 'ABC' });
    this.customer.companyName = 'Acme';

    nwService.getAllCustomers().then(custs => {
      this.customers = custs;
      // To validate that they are really in cache
      this.numInCache =  this._em.getEntities('Customer').length;
    });
  }
}
